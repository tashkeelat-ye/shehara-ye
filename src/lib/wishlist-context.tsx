import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const WISHLIST_STORAGE_KEY = "tashkilat_wishlist_v1";

type WishlistContextValue = {
  wishlistIds: string[];
  loading: boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  refreshWishlist: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

function readLocalWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalWishlist(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error("Local wishlist storage error:", e);
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // جلب المفضلة من السيرفر أو التخزين المحلي
  const refreshWishlist = useCallback(async () => {
    setLoading(true);
    try {
      if (user && navigator.onLine) {
        const { data } = await supabase
          .from("wishlists")
          .select("product_id")
          .eq("user_id", user.id);

        const serverIds = data ? data.map((item) => item.product_id) : [];
        setWishlistIds(serverIds);
        writeLocalWishlist(serverIds);
      } else {
        setWishlistIds(readLocalWishlist());
      }
    } catch (err) {
      console.warn("Error fetching wishlist:", err);
      setWishlistIds(readLocalWishlist());
    } finally {
      setLoading(false);
    }
  }, [user]);

  // مزامنة المفضلة المحلية مع الحساب عند الدخول
  useEffect(() => {
    async function syncWishlist() {
      if (user && navigator.onLine) {
        const local = readLocalWishlist();
        if (local.length > 0) {
          try {
            const { data: existing } = await supabase
              .from("wishlists")
              .select("product_id")
              .eq("user_id", user.id);

            const existingSet = new Set(existing?.map((e) => e.product_id) || []);
            const newEntries = local.filter((id) => !existingSet.has(id));

            if (newEntries.length > 0) {
              await supabase.from("wishlists").insert(
                newEntries.map((productId) => ({
                  user_id: user.id,
                  product_id: productId,
                }))
              );
            }
          } catch (e) {
            console.warn("Failed to sync local wishlist with DB:", e);
          }
        }
      }
      await refreshWishlist();
    }

    void syncWishlist();
  }, [user, refreshWishlist]);

  // إضافة أو إزالة المنتج من المفضلة
  const toggleWishlist = useCallback(
    async (productId: string) => {
      const exists = wishlistIds.includes(productId);
      const updated = exists
        ? wishlistIds.filter((id) => id !== productId)
        : [...wishlistIds, productId];

      // تحديث متفائل فوري للواجهة
      setWishlistIds(updated);
      writeLocalWishlist(updated);

      if (user && navigator.onLine) {
        try {
          if (exists) {
            await supabase
              .from("wishlists")
              .delete()
              .eq("user_id", user.id)
              .eq("product_id", productId);
          } else {
            await supabase.from("wishlists").insert({
              user_id: user.id,
              product_id: productId,
            });
          }
        } catch (e) {
          console.warn("Wishlist toggle DB error:", e);
          await refreshWishlist(); // إعادة المزامنة في حال فشل الطلب
        }
      }
    },
    [user, wishlistIds, refreshWishlist]
  );

  const isInWishlist = useCallback(
    (productId: string) => wishlistIds.includes(productId),
    [wishlistIds]
  );

  const value = useMemo(
    () => ({
      wishlistIds,
      loading,
      toggleWishlist,
      isInWishlist,
      refreshWishlist,
    }),
    [wishlistIds, loading, toggleWishlist, isInWishlist, refreshWishlist]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
