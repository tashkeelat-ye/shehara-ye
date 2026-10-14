import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock3,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { ProductImage } from "@/components/product-image";
import { supabase } from "@/integrations/supabase/client";
import { useFormatPrice } from "@/lib/currency-context";

type Suggestion = {
  id: string;
  name: string;
  price: number;
  old_price: number | null;
  images: string[];
  badge: string | null;
};

const RECENT_KEY = "shehara_recent_searches_v1";

function getRecentSearches(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === "string")
          .slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

function rememberSearch(query: string) {
  try {
    const next = [
      query,
      ...getRecentSearches().filter((item) => item !== query),
    ].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // البحث يعمل حتى إذا تعذر حفظ سجل البحث.
  }
}

export function ProductSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const formatPrice = useFormatPrice();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [recentRows, setRecentRows] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;

    setRecentRows(getRecentSearches());
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const term = query.trim();
    if (!term) {
      setRows([]);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    const timeout = window.setTimeout(() => {
      void supabase
        .from("products")
        .select("id,name,price,old_price,images,badge")
        .eq("is_active", true)
        .ilike("name", `%${term}%`)
        .order("sales_count", { ascending: false })
        .limit(7)
        .then(({ data, error: queryError }) => {
          if (cancelled) return;
          if (queryError) throw queryError;

          setRows(
            (data || []).map((product: any) => ({
              id: String(product.id),
              name: String(product.name || ""),
              price: Number(product.price) || 0,
              old_price:
                product.old_price == null
                  ? null
                  : Number(product.old_price) || 0,
              images: Array.isArray(product.images) ? product.images : [],
              badge: product.badge ? String(product.badge) : null,
            })),
          );
        })
        .catch(() => {
          if (!cancelled) {
            setRows([]);
            setError(true);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query, open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const term = query.trim();
    if (!term) return;

    rememberSearch(term);
    setRecentRows(getRecentSearches());
    onClose();
    void navigate({ to: "/products", search: { q: term } });
  };

  const chooseRecent = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  return (
    <div
      dir="rtl"
      className="
        fixed inset-0 z-[15000] flex items-start justify-center
        bg-[#06151D]/60 pt-[env(safe-area-inset-top)] backdrop-blur-sm
        sm:p-4 sm:pt-[calc(env(safe-area-inset-top)+1rem)]
      "
      role="dialog"
      aria-modal="true"
      aria-label="البحث عن المنتجات"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="
          flex h-[100dvh] w-full flex-col overflow-hidden bg-background shadow-2xl
          sm:h-auto sm:max-h-[760px] sm:max-w-2xl sm:rounded-3xl
          sm:border sm:border-border/70
        "
      >
        <div className="border-b border-border/70 px-4 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black tracking-[.16em] text-[#D65A31]">
                SHEHARA SEARCH
              </p>
              <h2 className="mt-1 text-lg font-black text-[#0E4D64] dark:text-white">
                ابحث عن منتجاتك
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق البحث"
              className="
                grid h-10 w-10 shrink-0 place-items-center rounded-xl
                bg-muted text-muted-foreground transition-colors
                hover:bg-muted/70 focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-[#D65A31]/50
                active:scale-95
              "
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={submit} role="search">
            <label className="sr-only" htmlFor="shehara-product-search">
              ابحث باسم المنتج
            </label>
            <div
              className="
                flex h-12 items-center gap-2 rounded-2xl
                border border-[#0E4D64]/10 bg-[#F5F8F9] px-3
                focus-within:ring-2 focus-within:ring-[#0E4D64]/15
                dark:bg-white/[.045] sm:h-14
              "
            >
              <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-[#0E4D64]" />
              <input
                id="shehara-product-search"
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                autoComplete="off"
                enterKeyHint="search"
                placeholder="ما الذي تبحث عنه؟"
                aria-controls="shehara-search-results"
                aria-busy={loading}
                className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
              />
              {loading ? (
                <Loader2
                  aria-label="جارٍ البحث"
                  className="h-5 w-5 shrink-0 animate-spin text-[#D65A31]"
                />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="مسح البحث"
                  className="
                    grid h-9 w-9 shrink-0 place-items-center rounded-xl
                    text-muted-foreground hover:bg-black/5
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-[#D65A31]/50
                  "
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div
          id="shehara-search-results"
          aria-live="polite"
          className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"
        >
          {!query.trim() ? (
            <div className="p-2">
              <div className="mb-3 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[#D65A31]" />
                <span className="text-xs font-black">عمليات البحث الأخيرة</span>
              </div>
              {recentRows.length ? (
                <div className="flex flex-wrap gap-2">
                  {recentRows.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => chooseRecent(term)}
                      className="
                        rounded-full border border-border px-3 py-2
                        text-[11px] font-bold transition-colors
                        hover:bg-muted focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-[#D65A31]/50
                        active:scale-95
                      "
                    >
                      {term}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                  <Sparkles className="mx-auto h-5 w-5 text-[#D65A31]" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    اكتب اسم المنتج لتظهر الاقتراحات مباشرة.
                  </p>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              تعذر تحميل اقتراحات المنتجات حاليًا. يمكنك متابعة البحث لعرض صفحة النتائج.
              <button
                type="button"
                onClick={() => submit()}
                className="
                  mx-auto mt-3 flex min-h-10 items-center gap-2 rounded-xl
                  bg-[#0E4D64] px-4 py-2 text-[11px] font-black text-white
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-[#D65A31]/60
                "
              >
                متابعة البحث <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          ) : rows.length ? (
            <div>
              <p className="px-2 pb-2 text-[10px] font-black text-muted-foreground">
                اقتراحات المنتجات
              </p>
              {rows.map((product) => (
                <Link
                  key={product.id}
                  to="/product/$id"
                  params={{ id: product.id }}
                  onClick={onClose}
                  className="
                    group flex items-center gap-3 rounded-2xl p-2.5
                    transition-colors hover:bg-[#0E4D64]/[.045]
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-inset focus-visible:ring-[#D65A31]/50
                  "
                >
                  <ProductImage
                    src={product.images[0]}
                    alt={product.name}
                    className="h-14 w-14 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black">{product.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <b className="text-xs text-[#0E4D64] dark:text-white">
                        {formatPrice(product.price)}
                      </b>
                      {product.old_price != null &&
                      product.old_price > product.price ? (
                        <span className="text-[9px] text-muted-foreground line-through">
                          {formatPrice(product.old_price)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ArrowLeft
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-[#D65A31]"
                  />
                </Link>
              ))}
              <button
                type="button"
                onClick={() => submit()}
                className="
                  mt-2 flex min-h-11 w-full items-center justify-center gap-2
                  rounded-2xl bg-[#0E4D64] px-3 text-xs font-black text-white
                  transition-colors hover:bg-[#0A3D50] active:scale-[.99]
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-[#D65A31]/60 focus-visible:ring-offset-2
                "
              >
                عرض كل النتائج عن «{query.trim()}»
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-2" aria-label="جارٍ تحميل النتائج">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex gap-3 p-2">
                  <div className="h-14 w-14 animate-pulse rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2 pt-2">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center sm:p-10">
              <Search className="mx-auto h-7 w-7 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-black">لا توجد منتجات مطابقة</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                جرّب كلمة أخرى أو تابع إلى صفحة البحث.
              </p>
              <button
                type="button"
                onClick={() => submit()}
                className="
                  mt-4 min-h-10 rounded-xl bg-[#D65A31] px-4 py-2.5
                  text-[11px] font-black text-white
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-[#0E4D64]/50 focus-visible:ring-offset-2
                "
              >
                البحث عن «{query.trim()}»
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductSearch;
