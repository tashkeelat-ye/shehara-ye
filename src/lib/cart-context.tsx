
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductsByIds, type Product } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";

const STORAGE_KEY = "shehara_cart_v1";
const MAX_QUANTITY = 999;

// Cart writes go directly to cart_items under the owner's RLS policy.
type CartWriteResult = { error: null };

async function checkedCartWrite(
  query: PromiseLike<{ error: unknown }>,
): Promise<CartWriteResult> {
  const result = await query;

  if (result.error) {
    throw result.error;
  }

  return { error: null };
}

// Cart writes go straight to the cart_items table (owner RLS policy).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cartRpc(
  name: string,
  args: Record<string, any> = {},
): Promise<CartWriteResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const uid = auth.user?.id;

  if (!uid) {
    throw new Error("يجب تسجيل الدخول لمزامنة سلة التسوق.");
  }

  if (name === "cart_add_item_atomic") {
    let query = db
      .from("cart_items")
      .select("id,quantity")
      .eq("user_id", uid)
      .eq("product_id", args.p_product_id);

    query =
      args.p_size == null
        ? query.is("size", null)
        : query.eq("size", args.p_size);

    query =
      args.p_color == null
        ? query.is("color", null)
        : query.eq("color", args.p_color);

    const { data: rows, error } = await query.limit(1);

    if (error) {
      throw error;
    }

    const row = rows?.[0];

    if (row) {
      return checkedCartWrite(
        db
          .from("cart_items")
          .update({
            quantity: Math.min(
              MAX_QUANTITY,
              Number(row.quantity) + args.p_quantity,
            ),
          })
          .eq("id", row.id)
          .eq("user_id", uid),
      );
    }

    return checkedCartWrite(
      db.from("cart_items").insert({
        user_id: uid,
        product_id: args.p_product_id,
        quantity: args.p_quantity,
        size: args.p_size,
        color: args.p_color,
      }),
    );
  }

  if (name === "cart_set_quantity") {
    return checkedCartWrite(
      db
        .from("cart_items")
        .update({ quantity: args.p_quantity })
        .eq("id", args.p_line_id)
        .eq("user_id", uid),
    );
  }

  if (name === "cart_remove_item") {
    return checkedCartWrite(
      db
        .from("cart_items")
        .delete()
        .eq("id", args.p_line_id)
        .eq("user_id", uid),
    );
  }

  if (name === "cart_clear") {
    return checkedCartWrite(
      db.from("cart_items").delete().eq("user_id", uid),
    );
  }

  throw new Error(`عملية سلة غير معروفة: ${name}`);
}

export type CartLine = {
  id: string;
  product_id: string;
  quantity: number;
  size: string | null;
  color: string | null;
};

export type CartItem = CartLine & { product: Product };

type AddArgs = {
  productId: string;
  quantity?: number;
  size?: string | null;
  color?: string | null;
  openDrawer?: boolean;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  loading: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addItem: (args: AddArgs) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
  getItemQuantity: (
    productId: string,
    size?: string | null,
    color?: string | null,
  ) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

function lineKey(
  productId: string,
  size: string | null,
  color: string | null,
) {
  return `${productId}|${size ?? ""}|${color ?? ""}`;
}

function readLocal(): CartLine[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    // Normalize legacy or duplicated local entries by product + variant.
    const normalized = new Map<string, CartLine>();

    for (const line of parsed) {
      if (
        !line ||
        typeof line.product_id !== "string" ||
        !line.product_id
      ) {
        continue;
      }

      const size = line.size ?? null;
      const color = line.color ?? null;
      const key = lineKey(line.product_id, size, color);
      const quantity = clampQuantity(Number(line.quantity) || 1);
      const previous = normalized.get(key);

      if (previous) {
        previous.quantity = clampQuantity(previous.quantity + quantity);
      } else {
        normalized.set(key, {
          id: line.id || key,
          product_id: line.product_id,
          quantity,
          size,
          color,
        });
      }
    }

    return Array.from(normalized.values());
  } catch {
    return [];
  }
}

function writeLocal(lines: CartLine[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch (error) {
    console.error("[Cart] localStorage write failed:", error);
  }
}

function clampQuantity(quantity: number) {
  const safe = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
  return Math.max(1, Math.min(MAX_QUANTITY, safe));
}

/**
 * Remove only the quantity successfully transferred to the cloud.
 * If the local quantity increased while a merge was running, keep the
 * additional quantity instead of deleting the entire local line.
 */
function removeTransferredLocalQuantity(transferred: CartLine) {
  const local = readLocal();
  const key = lineKey(
    transferred.product_id,
    transferred.size,
    transferred.color,
  );
  const index = local.findIndex(
    (line) =>
      lineKey(line.product_id, line.size, line.color) === key,
  );

  if (index < 0) {
    return;
  }

  const current = local[index]!;

  if (current.quantity <= transferred.quantity) {
    local.splice(index, 1);
  } else {
    local[index] = {
      ...current,
      quantity: current.quantity - transferred.quantity,
    };
  }

  writeLocal(local);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mergedFor = useRef<string | null>(null);

  const hydrateProducts = useCallback(async (current: CartLine[]) => {
    const ids = Array.from(
      new Set(current.map((line) => line.product_id)),
    );

    if (ids.length === 0) {
      setProducts({});
      return;
    }

    try {
      const rows = await fetchProductsByIds(ids);

      setProducts((previous) => ({
        ...previous,
        ...Object.fromEntries(
          rows.map((product) => [product.id, product]),
        ),
      }));
    } catch (error) {
      console.warn("[Cart] product hydration failed:", error);
    }
  }, []);

  const loadDbCart = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("cart_items")
      .select("id,product_id,quantity,size,color")
      .eq("user_id", userId)
      .order("created_at")
      .returns<CartLine[]>();

    if (error) {
      throw error;
    }

    return data ?? [];
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      if (user && navigator.onLine) {
        const next = await loadDbCart(user.id);
        setLines(next);
        writeLocal(next);
        await hydrateProducts(next);
      } else {
        const local = readLocal();
        setLines(local);
        await hydrateProducts(local);
      }
    } catch (error) {
      console.warn(
        "[Cart] cloud refresh failed; using local cart:",
        error,
      );

      const local = readLocal();
      setLines(local);
      await hydrateProducts(local);
    } finally {
      setLoading(false);
    }
  }, [user, loadDbCart, hydrateProducts]);

  useEffect(() => {
    let cancelled = false;

    async function mergeGuestCart() {
      if (!user || !navigator.onLine) {
        mergedFor.current = null;
        await refresh();
        return;
      }

      if (mergedFor.current === user.id) {
        await refresh();
        return;
      }

      mergedFor.current = user.id;
      const local = readLocal();

      if (local.length > 0) {
        try {
          for (const line of local) {
            await cartRpc("cart_add_item_atomic", {
              p_product_id: line.product_id,
              p_quantity: clampQuantity(line.quantity),
              p_size: line.size,
              p_color: line.color,
            });

            // The write succeeded. Remove only this transferred quantity.
            removeTransferredLocalQuantity(line);
          }
        } catch (error) {
          // Keep the failed line and every line not yet transferred.
          // Allow a later attempt instead of treating this merge as complete.
          mergedFor.current = null;
          console.warn("[Cart] guest cart merge stopped:", error);
        }
      }

      if (!cancelled) {
        await refresh();
      }
    }

    void mergeGuestCart();

    return () => {
      cancelled = true;
    };
  }, [user, refresh]);

  const addItem = useCallback<CartContextValue["addItem"]>(
    async ({
      productId,
      quantity = 1,
      size = null,
      color = null,
      openDrawer = false,
    }) => {
      if (openDrawer) {
        setDrawerOpen(true);
      }

      const safeQuantity = clampQuantity(quantity);
      const key = lineKey(productId, size, color);

      // Optimistic update. On a cloud failure, refresh restores the
      // last persisted/local state and the caller receives the error.
      setLines((previous) => {
        const index = previous.findIndex(
          (line) =>
            lineKey(line.product_id, line.size, line.color) === key,
        );

        if (index >= 0) {
          const next = [...previous];

          next[index] = {
            ...next[index]!,
            quantity: clampQuantity(
              next[index]!.quantity + safeQuantity,
            ),
          };

          return next;
        }

        return [
          ...previous,
          {
            id: key,
            product_id: productId,
            quantity: safeQuantity,
            size,
            color,
          },
        ];
      });

      if (user && navigator.onLine) {
        try {
          await cartRpc("cart_add_item_atomic", {
            p_product_id: productId,
            p_quantity: safeQuantity,
            p_size: size,
            p_color: color,
          });
        } catch (error) {
          console.error("[Cart] atomic add failed:", error);
          await refresh();
          throw error;
        }

        await refresh();
        return;
      }

      // Offline or guest mode: persist the change locally.
      const local = readLocal();
      const found = local.find(
        (line) =>
          lineKey(line.product_id, line.size, line.color) === key,
      );

      if (found) {
        found.quantity = clampQuantity(found.quantity + safeQuantity);
      } else {
        local.push({
          id: key,
          product_id: productId,
          quantity: safeQuantity,
          size,
          color,
        });
      }

      writeLocal(local);
      setLines(local);
      await hydrateProducts(local);
    },
    [user, refresh, hydrateProducts],
  );

  const updateQuantity = useCallback<CartContextValue["updateQuantity"]>(
    async (lineId, quantity) => {
      if (!Number.isFinite(quantity) || quantity < 1) {
        if (quantity === 0) {
          await removeItem(lineId);
          return;
        }

        throw new Error("الكمية يجب أن تكون عددًا صحيحًا أكبر من صفر.");
      }

      const safeQuantity = clampQuantity(quantity);

      setLines((previous) =>
        previous.map((line) =>
          line.id === lineId
            ? { ...line, quantity: safeQuantity }
            : line,
        ),
      );

      if (user && navigator.onLine) {
        try {
          await cartRpc("cart_set_quantity", {
            p_line_id: lineId,
            p_quantity: safeQuantity,
          });

          await refresh();
        } catch (error) {
          console.error("[Cart] quantity update failed:", error);
          await refresh();
          throw error;
        }

        return;
      }

      const local = readLocal().map((line) =>
        line.id === lineId
          ? { ...line, quantity: safeQuantity }
          : line,
      );

      writeLocal(local);
      setLines(local);
    },
    [user, refresh, removeItem],
  );

  const removeItem = useCallback<CartContextValue["removeItem"]>(
    async (lineId) => {
      setLines((previous) =>
        previous.filter((line) => line.id !== lineId),
      );

      if (user && navigator.onLine) {
        try {
          await cartRpc("cart_remove_item", {
            p_line_id: lineId,
          });

          await refresh();
        } catch (error) {
          console.error("[Cart] remove failed:", error);
          await refresh();
          throw error;
        }

        return;
      }

      const local = readLocal().filter((line) => line.id !== lineId);
      writeLocal(local);
      setLines(local);
    },
    [user, refresh],
  );

  const clearCart = useCallback(async () => {
    if (user && navigator.onLine) {
      try {
        // Do not erase the local snapshot before the cloud confirms the
        // delete. This is especially important after checkout completes.
        await cartRpc("cart_clear");
        setLines([]);
        writeLocal([]);
        setProducts({});
      } catch (error) {
        console.error("[Cart] clear failed:", error);
        await refresh();
        throw error;
      }

      return;
    }

    const empty: CartLine[] = [];
    setLines(empty);
    writeLocal(empty);
    setProducts({});
  }, [user, refresh]);

  const getItemQuantity = useCallback(
    (
      productId: string,
      size: string | null = null,
      color: string | null = null,
    ) => {
      const key = lineKey(productId, size, color);
      const found = lines.find(
        (line) =>
          lineKey(line.product_id, line.size, line.color) === key,
      );

      return found?.quantity ?? 0;
    },
    [lines],
  );

  const items = useMemo<CartItem[]>(
    () =>
      lines
        .map((line) => {
          const product = products[line.product_id];
          return product ? { ...line, product } : null;
        })
        .filter((value): value is CartItem => value !== null),
    [lines, products],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      total: items.reduce(
        (sum, item) => sum + (item.product?.price ?? 0) * item.quantity,
        0,
      ),
      loading,
      drawerOpen,
      setDrawerOpen,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      refresh,
      getItemQuantity,
    }),
    [
      items,
      lines,
      loading,
      drawerOpen,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      refresh,
      getItemQuantity,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
