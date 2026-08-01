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

const STORAGE_KEY = "tashkilat_cart_v1";

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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
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
    const rows = await fetchProductsByIds(ids);
    setProducts(Object.fromEntries(rows.map((p) => [p.id, p])));
  }, []);

  const loadDbCart = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("cart_items")
      .select("id,product_id,quantity,size,color")
      .eq("user_id", userId)
      .order("created_at")
      .returns<CartLine[]>();
    return data ?? [];
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = user ? await loadDbCart(user.id) : readLocal();
      setLines(next);
      await hydrateProducts(next);
    } finally {
      setLoading(false);
    }
  }, [user, loadDbCart, hydrateProducts]);

  // دمج سلة الزائر مع سلة الحساب عند تسجيل الدخول
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user) {
        mergedFor.current = null;
        await refresh();
        return;
      }
      if (mergedFor.current !== user.id) {
        mergedFor.current = user.id;
        const local = readLocal();
        if (local.length > 0) {
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
                .update({ quantity: found.quantity + l.quantity })
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
    async ({ productId, quantity = 1, size = null, color = null }) => {
      if (user) {
        const current = await loadDbCart(user.id);
        const found = current.find(
          (l) => lineKey(l.product_id, l.size, l.color) === lineKey(productId, size, color),
        );
        if (found) {
          await supabase
            .from("cart_items")
            .update({ quantity: found.quantity + quantity })
            .eq("id", found.id);
        } else {
          await supabase.from("cart_items").insert({
            user_id: user.id,
            product_id: productId,
            quantity,
            size,
            color,
          });
        }
      } else {
        const current = readLocal();
        const key = lineKey(productId, size, color);
        const found = current.find((l) => lineKey(l.product_id, l.size, l.color) === key);
        if (found) found.quantity += quantity;
        else
          current.push({ id: key, product_id: productId, quantity, size, color });
        writeLocal(current);
      }
      await refresh();
    },
    [user, loadDbCart, refresh],
  );

  const updateQuantity = useCallback<CartContextValue["updateQuantity"]>(
    async (lineId, quantity) => {
      if (quantity < 1) return;
      if (user) {
        await supabase.from("cart_items").update({ quantity }).eq("id", lineId);
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
      if (user) {
        await supabase.from("cart_items").delete().eq("id", lineId);
      } else {
        writeLocal(readLocal().filter((l) => l.id !== lineId));
      }
      await refresh();
    },
    [user, refresh],
  );

  const clearCart = useCallback(async () => {
    if (user) {
      await supabase.from("cart_items").delete().eq("user_id", user.id);
    } else {
      writeLocal([]);
    }
    await refresh();
  }, [user, refresh]);

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
      total: items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
      loading,
      drawerOpen,
      setDrawerOpen,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      refresh,
    }),
    [items, lines, loading, drawerOpen, addItem, updateQuantity, removeItem, clearCart, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
