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
  getItemQuantity: (productId: string, size?: string | null, color?: string | null) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

function lineKey(productId: string, size: string | null, color: string | null) {
  return `${productId}|${size ?? ""}|${color ?? ""}`;
}

function readLocal(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mergedFor = useRef<string | null>(null);

  const hydrateProducts = useCallback(async (current: CartLine[]) => {
    const ids = Array.from(new Set(current.map((l) => l.product_id)));
    if (ids.length === 0) {
      setProducts({});
      return;
    }
    try {
      const rows = await fetchProductsByIds(ids);
      setProducts((prev) => ({
        ...prev,
        ...Object.fromEntries(rows.map((p) => [p.id, p])),
      }));
    } catch (err) {
      console.warn("Could not fetch products for cart (offline mode):", err);
    }
  }, []);

  const loadDbCart = useCallback(async (userId: string) => {
    try {
      if (!navigator.onLine) return readLocal();
      const { data } = await supabase
        .from("cart_items")
        .select("id,product_id,quantity,size,color")
        .eq("user_id", userId)
        .order("created_at")
        .returns<CartLine[]>();
      return data ?? [];
    } catch {
      return readLocal();
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = (user && navigator.onLine) ? await loadDbCart(user.id) : readLocal();
      setLines(next);
      writeLocal(next);
      await hydrateProducts(next);
    } finally {
      setLoading(false);
    }
  }, [user, loadDbCart, hydrateProducts]);

  // دمج سلة الزائر مع السلة السحابية بعد تسجيل الدخول
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user || !navigator.onLine) {
        mergedFor.current = null;
        await refresh();
        return;
      }

      if (mergedFor.current !== user.id) {
        mergedFor.current = user.id;
        const local = readLocal();
        if (local.length > 0) {
          try {
            const existing = await loadDbCart(user.id);
            const map = new Map(
              existing.map((l) => [lineKey(l.product_id, l.size, l.color), l]),
            );

            for (const l of local) {
              const key = lineKey(l.product_id, l.size, l.color);
              const found = map.get(key);
              if (found) {
                await supabase
                  .from("cart_items")
                  .update({ quantity: Math.max(found.quantity, l.quantity) })
                  .eq("id", found.id);
              } else {
                await supabase.from("cart_items").insert({
                  user_id: user.id,
                  product_id: l.product_id,
                  quantity: l.quantity,
                  size: l.size,
                  color: l.color,
                });
              }
            }
            writeLocal([]);
          } catch (e) {
            console.warn("Failed to merge cart to cloud:", e);
          }
        }
      }
      if (!cancelled) await refresh();
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [user, refresh, loadDbCart]);

  const addItem = useCallback<CartContextValue["addItem"]>(
    async ({ productId, quantity = 1, size = null, color = null, openDrawer = false }) => {
      if (openDrawer) setDrawerOpen(true);

      // تحديث متفائل في الواجهة فوراً
      const key = lineKey(productId, size, color);
      setLines((prev) => {
        const index = prev.findIndex((l) => lineKey(l.product_id, l.size, l.color) === key);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index]!, quantity: updated[index]!.quantity + quantity };
          return updated;
        }
        return [...prev, { id: key, product_id: productId, quantity, size, color }];
      });

      if (user && navigator.onLine) {
        try {
          const dbCart = await loadDbCart(user.id);
          const dbFound = dbCart.find(
            (l) => lineKey(l.product_id, l.size, l.color) === key,
          );
          if (dbFound) {
            await supabase
              .from("cart_items")
              .update({ quantity: dbFound.quantity + quantity })
              .eq("id", dbFound.id);
          } else {
            await supabase.from("cart_items").insert({
              user_id: user.id,
              product_id: productId,
              quantity,
              size,
              color,
            });
          }
        } catch (e) {
          console.warn("Error adding item to DB cart:", e);
        }
      } else {
        const current = readLocal();
        const found = current.find((l) => lineKey(l.product_id, l.size, l.color) === key);
        if (found) {
          found.quantity += quantity;
        } else {
          current.push({ id: key, product_id: productId, quantity, size, color });
        }
        writeLocal(current);
      }
      await refresh();
    },
    [user, loadDbCart, refresh],
  );

  const updateQuantity = useCallback<CartContextValue["updateQuantity"]>(
    async (lineId, quantity) => {
      if (quantity < 1) {
        await removeItem(lineId);
        return;
      }

      setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, quantity } : l)));

      if (user && navigator.onLine) {
        try {
          await supabase.from("cart_items").update({ quantity }).eq("id", lineId);
        } catch (e) {
          console.warn("Updated local cart only:", e);
        }
      } else {
        const current = readLocal().map((l) => (l.id === lineId ? { ...l, quantity } : l));
        writeLocal(current);
      }
      await refresh();
    },
    [user, refresh],
  );

  const removeItem = useCallback<CartContextValue["removeItem"]>(
    async (lineId) => {
      setLines((prev) => prev.filter((l) => l.id !== lineId));

      if (user && navigator.onLine) {
        try {
          await supabase.from("cart_items").delete().eq("id", lineId);
        } catch (e) {
          console.warn("Deleted from local cart only:", e);
        }
      } else {
        const current = readLocal().filter((l) => l.id !== lineId);
        writeLocal(current);
      }
      await refresh();
    },
    [user, refresh],
  );

  const clearCart = useCallback(async () => {
    setLines([]);
    writeLocal([]);
    if (user && navigator.onLine) {
      try {
        await supabase.from("cart_items").delete().eq("user_id", user.id);
      } catch (e) {
        console.warn("Cleared local cart only:", e);
      }
    }
    await refresh();
  }, [user, refresh]);

  const getItemQuantity = useCallback(
    (productId: string, size: string | null = null, color: string | null = null) => {
      const key = lineKey(productId, size, color);
      const found = lines.find((l) => lineKey(l.product_id, l.size, l.color) === key);
      return found ? found.quantity : 0;
    },
    [lines],
  );

  const items = useMemo<CartItem[]>(
    () =>
      lines
        .map((l) => {
          const product = products[l.product_id];
          return product ? { ...l, product } : null;
        })
        .filter((v): v is CartItem => v !== null),
    [lines, products],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      total: items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0),
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
    [items, lines, loading, drawerOpen, addItem, updateQuantity, removeItem, clearCart, refresh, getItemQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
