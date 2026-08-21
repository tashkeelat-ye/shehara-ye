import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "@tanstack/react-router";

import {
  Moon,
  Search,
  ShoppingCart,
  Sun,
  User,
  X,
  ArrowLeft,
  Clock3,
} from "lucide-react";

import { useCart } from "@/lib/cart-context";
import { BrandLogo } from "@/components/brand-logo";
import {
  STORE_TAGLINE,
} from "@/lib/logo";
import { SideMenu } from "@/components/side-menu";
import { NotificationBell } from "@/components/notification-bell";
import { CurrencySwitcher } from "@/lib/currency-context";
import { AnnouncementBar } from "@/components/announcement-bar";
import {
  fetchProducts,
  type Product,
} from "@/lib/db";

const THEME_STORAGE_KEY =
  "tashkilat-theme";

const SEARCH_HISTORY_KEY =
  "tashkilat-search-history";

const MAX_SEARCH_HISTORY = 5;

/**
 * =========================================================
 * ألوان الهوية
 * =========================================================
 */

const BRAND_BURGUNDY =
  "#4A1525";

const BRAND_BURGUNDY_DARK =
  "#35101C";

const BRAND_GOLD =
  "#E0B85C";

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

function readSearchHistory(): string[] {
  try {
    const stored =
      localStorage.getItem(
        SEARCH_HISTORY_KEY,
      );

    if (!stored) {
      return [];
    }

    const parsed =
      JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item): item is string =>
          typeof item === "string",
      )
      .map((item) =>
        item.trim(),
      )
      .filter(Boolean)
      .slice(
        0,
        MAX_SEARCH_HISTORY,
      );
  } catch {
    return [];
  }
}

function saveSearchTerm(
  value: string,
) {
  const normalized =
    value.trim();

  if (!normalized) {
    return;
  }

  try {
    const current =
      readSearchHistory();

    const next = [
      normalized,
      ...current.filter(
        (item) =>
          item.toLowerCase() !==
          normalized.toLowerCase(),
      ),
    ].slice(
      0,
      MAX_SEARCH_HISTORY,
    );

    localStorage.setItem(
      SEARCH_HISTORY_KEY,
      JSON.stringify(next),
    );
  } catch {
    // localStorage may be unavailable.
  }
}

function getProductImage(
  product: Product,
): string | null {
  const image =
    product.images?.find(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0,
    );

  return image || null;
}

/**
 * =========================================================
 * Search Suggestion
 * =========================================================
 */

function SearchSuggestionItem({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (
    product: Product,
  ) => void;
}) {
  const image =
    getProductImage(product);

  return (
    <button
      type="button"
      onMouseDown={(event) => {
        /*
         * onMouseDown يمنع اختفاء القائمة
         * قبل تنفيذ الاختيار عندما ينتقل التركيز
         * من حقل البحث.
         */
        event.preventDefault();
      }}
      onClick={() =>
        onSelect(product)
      }
      className="
        group
        flex
        w-full
        items-center
        gap-3
        rounded-xl
        px-3
        py-2.5
        text-right
        transition-colors
        hover:bg-[#4A1525]/[0.045]
        focus-visible:bg-[#4A1525]/[0.06]
        focus-visible:outline-none
        dark:hover:bg-[#E0B85C]/[0.06]
        dark:focus-visible:bg-[#E0B85C]/[0.08]
      "
      dir="rtl"
    >
      <span
        className="
          relative
          h-12
          w-12
          shrink-0
          overflow-hidden
          rounded-xl
          border
          border-[#E0B85C]/15
          bg-secondary
        "
      >
        {image ? (
          <img
            src={image}
            alt=""
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            draggable={false}
            onContextMenu={(event) => {
              event.preventDefault();
            }}
            className="
              h-full
              w-full
              select-none
              object-cover
              [-webkit-user-drag:none]
            "
          />
        ) : (
          <span
            className="
              grid
              h-full
              w-full
              place-items-center
              bg-[#4A1525]/5
              text-[#4A1525]/40
              dark:bg-[#E0B85C]/5
              dark:text-[#E0B85C]/40
            "
          >
            <Search
              className="h-4 w-4"
              aria-hidden="true"
            />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className="
            block
            truncate
            text-[13px]
            font-bold
            text-foreground
          "
        >
          {product.name}
        </span>

        <span
          className="
            mt-0.5
            block
            truncate
            text-[10px]
            text-muted-foreground
          "
        >
          {product.city ||
            "متجر تشكيلات"}
        </span>
      </span>

      <span
        className="
          shrink-0
          text-[11px]
          font-extrabold
          text-[#4A1525]
          dark:text-[#E0B85C]
        "
      >
        {Number(
          product.price,
        ).toLocaleString(
          "ar-EG",
        )}
      </span>

      <ArrowLeft
        className="
          h-4
          w-4
          shrink-0
          text-muted-foreground
          transition-transform
          group-hover:-translate-x-0.5
        "
        aria-hidden="true"
      />
    </button>
  );
}

/**
 * =========================================================
 * Site Header
 * =========================================================
 */

export function SiteHeader() {
  const {
    count,
    setDrawerOpen,
  } = useCart();

  const [
    term,
    setTerm,
  ] = useState("");

  const [
    isDark,
    setIsDark,
  ] = useState(false);

  const [
    suggestions,
    setSuggestions,
  ] = useState<Product[]>([]);

  const [
    searchHistory,
    setSearchHistory,
  ] = useState<string[]>([]);

  const [
    isSearchFocused,
    setIsSearchFocused,
  ] = useState(false);

  const [
    isSearching,
    setIsSearching,
  ] = useState(false);

  const navigate =
    useNavigate();

  const searchRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const searchTimer =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  /**
   * =======================================================
   * تهيئة الوضع الليلي
   * =======================================================
   */

  useEffect(() => {
    const root =
      document.documentElement;

    const current =
      root.classList.contains(
        "dark",
      );

    setIsDark(current);
  }, []);

  /**
   * =======================================================
   * سجل البحث
   * =======================================================
   */

  useEffect(() => {
    setSearchHistory(
      readSearchHistory(),
    );
  }, []);

  /**
   * =======================================================
   * إغلاق الاقتراحات عند النقر خارجها
   * =======================================================
   */

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      const target =
        event.target;

      if (
        target instanceof
          Node &&
        searchRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      setIsSearchFocused(
        false,
      );
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  /**
   * =======================================================
   * تنظيف مؤقت البحث
   * =======================================================
   */

  useEffect(() => {
    return () => {
      if (
        searchTimer.current
      ) {
        clearTimeout(
          searchTimer.current,
        );
      }
    };
  }, []);

  /**
   * =======================================================
   * البحث الفوري
   * =======================================================
   *
   * ننتظر 250ms بعد توقف الكتابة قبل الاتصال
   * بمصدر البيانات حتى لا نرسل طلباً لكل حرف.
   */

  useEffect(() => {
    const query =
      term.trim();

    if (
      searchTimer.current
    ) {
      clearTimeout(
        searchTimer.current,
      );
    }

    if (
      query.length < 2
    ) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    searchTimer.current =
      setTimeout(
        async () => {
          setIsSearching(true);

          try {
            const products =
              await fetchProducts({
                sort: "best",
                limit: 6,
              });

            const normalizedQuery =
              query.toLocaleLowerCase(
                "ar",
              );

            /*
             * fetchProducts الحالية لا تحتوي على
             * text-search parameter.
             *
             * لذلك نستخدم نتائج حقيقية من المتجر
             * ونرشحها في الواجهة حسب الاسم والوصف
             * والمدينة.
             *
             * لاحقاً يمكن نقل هذا إلى Supabase
             * Full Text Search عندما نضيفه إلى قاعدة
             * البيانات.
             */

            const filtered =
              products.filter(
                (product) => {
                  const name =
                    product.name
                      .toLocaleLowerCase(
                        "ar",
                      );

                  const description =
                    product.description
                      ?.toLocaleLowerCase(
                        "ar",
                      ) ?? "";

                  const city =
                    product.city
                      ?.toLocaleLowerCase(
                        "ar",
                      ) ?? "";

                  return (
                    name.includes(
                      normalizedQuery,
                    ) ||
                    description.includes(
                      normalizedQuery,
                    ) ||
                    city.includes(
                      normalizedQuery,
                    )
                  );
                },
              );

            setSuggestions(
              filtered.slice(
                0,
                5,
              ),
            );
          } catch (error) {
            console.warn(
              "[Search] تعذر تحميل اقتراحات البحث.",
              error,
            );

            setSuggestions([]);
          } finally {
            setIsSearching(
              false,
            );
          }
        },
        250,
      );

    return () => {
      if (
        searchTimer.current
      ) {
        clearTimeout(
          searchTimer.current,
        );
      }
    };
  }, [term]);

  /**
   * =======================================================
   * تغيير الوضع
   * =======================================================
   */

  function toggleTheme() {
    const nextTheme =
      isDark
        ? "light"
        : "dark";

    document.documentElement.classList.toggle(
      "dark",
      nextTheme === "dark",
    );

    document.documentElement.style.colorScheme =
      nextTheme;

    localStorage.setItem(
      THEME_STORAGE_KEY,
      nextTheme,
    );

    setIsDark(
      nextTheme === "dark",
    );
  }

  /**
   * =======================================================
   * مسح البحث
   * =======================================================
   */

  function clearSearch() {
    setTerm("");
    setSuggestions([]);

    window.requestAnimationFrame(
      () => {
        inputRef.current?.focus();
      },
    );
  }

  /**
   * =======================================================
   * تنفيذ البحث
   * =======================================================
   */

  function submitSearch(
    value = term,
  ) {
    const query =
      value.trim();

    if (!query) {
      return;
    }

    saveSearchTerm(
      query,
    );

    setSearchHistory(
      readSearchHistory(),
    );

    setIsSearchFocused(
      false,
    );

    setSuggestions([]);

    void navigate({
      to: "/products",
      search: {
        q:
          query ||
          undefined,
      },
    });
  }

  /**
   * =======================================================
   * اختيار منتج من الاقتراحات
   * =======================================================
   */

  function selectSuggestion(
    product: Product,
  ) {
    saveSearchTerm(
      product.name,
    );

    setSearchHistory(
      readSearchHistory(),
    );

    setTerm(
      product.name,
    );

    setIsSearchFocused(
      false,
    );

    setSuggestions([]);

    void navigate({
      to: "/products",
      search: {
        q: product.name,
      },
    });
  }

  /**
   * =======================================================
   * اختيار بحث سابق
   * =======================================================
   */

  function selectHistory(
    value: string,
  ) {
    setTerm(value);
    submitSearch(value);
  }

  const showSearchPanel =
    isSearchFocused &&
    (term.trim().length >=
      2 ||
      searchHistory.length >
        0);

  return (
    <header
      className="
        sticky
        top-0
        z-40
        border-b
        border-[#E0B85C]/15
        bg-[#FBF7EF]/[0.96]
        shadow-[0_4px_25px_-20px_rgba(74,21,37,0.55)]
        backdrop-blur-xl
        supports-[backdrop-filter]:bg-[#FBF7EF]/[0.88]
        dark:border-[#E0B85C]/10
        dark:bg-[#170C11]/[0.96]
        dark:supports-[backdrop-filter]:bg-[#170C11]/[0.88]
      "
    >
      <AnnouncementBar />

      <div
        className="
          mx-auto
          w-full
          max-w-6xl
          px-3
          pb-2.5
          pt-2
          sm:px-4
          sm:py-3
        "
      >
        <div
          className="
            flex
            min-h-10
            items-center
            justify-between
            gap-2
            sm:min-h-11
            sm:gap-3
          "
        >
          {/* =================================================
              الشعار
              ================================================= */}

          <Link
            to="/"
            aria-label="العودة إلى الصفحة الرئيسية"
            className="
              group
              flex
              min-w-0
              items-center
              gap-2
              rounded-xl
              outline-none
              transition-opacity
              active:opacity-70
              focus-visible:ring-2
              focus-visible:ring-[#E0B85C]/50
            "
          >
            <span
              className="
                relative
                shrink-0
                rounded-xl
                ring-1
                ring-[#E0B85C]/20
              "
            >
              <BrandLogo
                size={36}
                className="
                  h-9
                  w-9
                  shrink-0
                  sm:h-10
                  sm:w-10
                "
              />

              <span
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  -inset-0.5
                  rounded-[0.85rem]
                  border
                  border-[#E0B85C]/20
                "
              />
            </span>

            <div className="min-w-0">
              <p
                className="
                  truncate
                  text-[15px]
                  font-extrabold
                  leading-tight
                  text-[#4A1525]
                  transition-colors
                  group-hover:text-[#6A263A]
                  dark:text-[#E0B85C]
                  sm:text-lg
                "
              >
                تشكيلات
              </p>

              <p
                className="
                  hidden
                  truncate
                  text-[10px]
                  leading-tight
                  text-muted-foreground
                  sm:block
                  sm:text-[11px]
                "
              >
                {STORE_TAGLINE}
              </p>
            </div>
          </Link>

          {/* =================================================
              أدوات الهيدر
              ================================================= */}

          <div
            className="
              flex
              shrink-0
              items-center
              gap-0.5
              sm:gap-1
            "
          >
            <CurrencySwitcher className="hidden sm:inline-flex" />

            <NotificationBell />

            <button
              type="button"
              onClick={
                toggleTheme
              }
              aria-label={
                isDark
                  ? "تفعيل الوضع النهاري"
                  : "تفعيل الوضع الليلي"
              }
              title={
                isDark
                  ? "الوضع النهاري"
                  : "الوضع الليلي"
              }
              className="
                grid
                h-10
                w-10
                place-items-center
                rounded-xl
                text-foreground
                transition-all
                hover:bg-[#4A1525]/[0.055]
                hover:text-[#4A1525]
                active:scale-95
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#E0B85C]/50
                dark:hover:bg-[#E0B85C]/[0.07]
                dark:hover:text-[#E0B85C]
              "
            >
              {isDark ? (
                <Sun
                  aria-hidden="true"
                  className="
                    h-[19px]
                    w-[19px]
                  "
                  strokeWidth={2}
                />
              ) : (
                <Moon
                  aria-hidden="true"
                  className="
                    h-[19px]
                    w-[19px]
                  "
                  strokeWidth={2}
                />
              )}
            </button>

            <Link
              to="/account"
              aria-label="حسابي"
              className="
                grid
                h-10
                w-10
                place-items-center
                rounded-xl
                text-foreground
                transition-all
                hover:bg-[#4A1525]/[0.055]
                hover:text-[#4A1525]
                active:scale-95
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#E0B85C]/50
                dark:hover:bg-[#E0B85C]/[0.07]
                dark:hover:text-[#E0B85C]
              "
            >
              <User
                className="
                  h-[19px]
                  w-[19px]
                "
                strokeWidth={2}
              />
            </Link>

            <button
              type="button"
              aria-label="فتح سلة التسوق"
              onClick={() =>
                setDrawerOpen(
                  true,
                )
              }
              className="
                relative
                grid
                h-10
                w-10
                place-items-center
                rounded-xl
                text-foreground
                transition-all
                hover:bg-[#4A1525]/[0.055]
                hover:text-[#4A1525]
                active:scale-95
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#E0B85C]/50
                dark:hover:bg-[#E0B85C]/[0.07]
                dark:hover:text-[#E0B85C]
              "
            >
              <ShoppingCart
                className="
                  h-[19px]
                  w-[19px]
                "
                strokeWidth={2}
              />

              {count > 0 ? (
                <span
                  aria-label={`${count.toLocaleString(
                    "ar-EG",
                  )} منتجات في السلة`}
                  className="
                    absolute
                    -right-0.5
                    -top-0.5
                    grid
                    h-[18px]
                    min-w-[18px]
                    place-items-center
                    rounded-full
                    bg-[#4A1525]
                    px-1
                    text-[9px]
                    font-extrabold
                    leading-none
                    text-white
                    shadow-sm
                    ring-2
                    ring-[#FBF7EF]
                    dark:bg-[#E0B85C]
                    dark:text-[#35101C]
                    dark:ring-[#170C11]
                  "
                >
                  {count > 99
                    ? "99+"
                    : count.toLocaleString(
                        "ar-EG",
                      )}
                </span>
              ) : null}
            </button>

            <SideMenu />
          </div>
        </div>

        {/* ===================================================
            البحث
            =================================================== */}

        <div
          ref={searchRef}
          className="
            relative
            mt-2.5
            sm:mt-3
          "
        >
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();

              submitSearch();
            }}
          >
            <div
              className="
                relative
              "
            >
              <Search
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  start-3.5
                  top-1/2
                  h-[18px]
                  w-[18px]
                  -translate-y-1/2
                  text-[#4A1525]/55
                  dark:text-[#E0B85C]/65
                "
                strokeWidth={2}
              />

              <input
                ref={inputRef}
                type="search"
                inputMode="search"
                value={term}
                onChange={(
                  event,
                ) =>
                  setTerm(
                    event.target
                      .value,
                  )
                }
                onFocus={() =>
                  setIsSearchFocused(
                    true,
                  )
                }
                placeholder="ابحث عن منتج أو ماركة أو فئة..."
                aria-label="البحث في متجر تشكيلات"
                aria-expanded={
                  showSearchPanel
                }
                aria-controls="search-suggestions"
                enterKeyHint="search"
                autoComplete="off"
                spellCheck={false}
                className="
                  h-11
                  w-full
                  rounded-2xl
                  border
                  border-[#E0B85C]/20
                  bg-white/70
                  ps-10
                  pe-10
                  text-[13px]
                  text-foreground
                  outline-none
                  transition-all
                  duration-200
                  placeholder:text-muted-foreground/75
                  focus:border-[#E0B85C]/55
                  focus:bg-white
                  focus:ring-2
                  focus:ring-[#E0B85C]/15
                  dark:bg-white/[0.035]
                  dark:focus:bg-white/[0.055]
                  sm:h-11
                  sm:text-sm
                "
              />

              {term.length >
              0 ? (
                <button
                  type="button"
                  onClick={
                    clearSearch
                  }
                  aria-label="مسح البحث"
                  className="
                    absolute
                    end-2
                    top-1/2
                    grid
                    h-8
                    w-8
                    -translate-y-1/2
                    place-items-center
                    rounded-lg
                    text-muted-foreground
                    transition-colors
                    hover:bg-[#4A1525]/[0.055]
                    hover:text-[#4A1525]
                    active:scale-95
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#E0B85C]/50
                    dark:hover:bg-[#E0B85C]/[0.07]
                    dark:hover:text-[#E0B85C]
                  "
                >
                  <X
                    aria-hidden="true"
                    className="h-4 w-4"
                    strokeWidth={2}
                  />
                </button>
              ) : null}
            </div>
          </form>

          {/* =================================================
              لوحة الاقتراحات
              ================================================= */}

          {showSearchPanel ? (
            <div
              id="search-suggestions"
              role="listbox"
              className="
                absolute
                inset-x-0
                top-[calc(100%+0.5rem)]
                z-50
                overflow-hidden
                rounded-2xl
                border
                border-[#E0B85C]/20
                bg-[#FBF7EF]
                shadow-[0_18px_55px_-25px_rgba(53,16,28,0.5)]
                dark:bg-[#211117]
              "
            >
              {/* خط الهوية العلوي */}

              <div
                aria-hidden="true"
                className="
                  h-px
                  w-full
                  bg-gradient-to-r
                  from-transparent
                  via-[#E0B85C]/50
                  to-transparent
                "
              />

              {term.trim().length >=
              2 ? (
                <div className="p-2">
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      px-3
                      pb-1.5
                      pt-1
                    "
                  >
                    <span
                      className="
                        text-[10px]
                        font-bold
                        text-muted-foreground
                      "
                    >
                      اقتراحات البحث
                    </span>

                    {isSearching ? (
                      <span
                        className="
                          h-3
                          w-3
                          animate-spin
                          rounded-full
                          border-2
                          border-[#E0B85C]/25
                          border-t-[#4A1525]
                          dark:border-t-[#E0B85C]
                        "
                        aria-label="جاري البحث"
                      />
                    ) : null}
                  </div>

                  {suggestions.length >
                  0 ? (
                    <div
                      className="
                        max-h-[360px]
                        overflow-y-auto
                        overscroll-contain
                      "
                    >
                      {suggestions.map(
                        (
                          product,
                        ) => (
                          <SearchSuggestionItem
                            key={
                              product.id
                            }
                            product={
                              product
                            }
                            onSelect={
                              selectSuggestion
                            }
                          />
                        ),
                      )}
                    </div>
                  ) : !isSearching ? (
                    <div
                      className="
                        px-4
                        py-7
                        text-center
                      "
                    >
                      <span
                        className="
                          mx-auto
                          mb-2
                          grid
                          h-10
                          w-10
                          place-items-center
                          rounded-xl
                          bg-[#4A1525]/[0.06]
                          text-[#4A1525]/60
                          dark:bg-[#E0B85C]/[0.07]
                          dark:text-[#E0B85C]/70
                        "
                      >
                        <Search
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      </span>

                      <p
                        className="
                          text-xs
                          font-bold
                          text-foreground
                        "
                      >
                        لا توجد اقتراحات مطابقة
                      </p>

                      <p
                        className="
                          mt-1
                          text-[10px]
                          text-muted-foreground
                        "
                      >
                        اضغط Enter للبحث عن
                        «{term.trim()}»
                      </p>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onMouseDown={(
                      event,
                    ) =>
                      event.preventDefault()
                    }
                    onClick={() =>
                      submitSearch()
                    }
                    className="
                      mt-1
                      flex
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-[#E0B85C]/15
                      bg-[#4A1525]/[0.035]
                      px-3
                      py-2.5
                      text-xs
                      font-bold
                      text-[#4A1525]
                      transition-colors
                      hover:bg-[#4A1525]/[0.07]
                      dark:bg-[#E0B85C]/[0.045]
                      dark:text-[#E0B85C]
                      dark:hover:bg-[#E0B85C]/[0.08]
                    "
                  >
                    <Search
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />

                    البحث عن «
                    {term.trim()}
                    »
                  </button>
                </div>
              ) : (
                <div className="p-2">
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      px-3
                      pb-1.5
                      pt-1
                    "
                  >
                    <span
                      className="
                        flex
                        items-center
                        gap-1.5
                        text-[10px]
                        font-bold
                        text-muted-foreground
                      "
                    >
                      <Clock3
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />

                      عمليات البحث الأخيرة
                    </span>

                    {searchHistory.length >
                    0 ? (
                      <button
                        type="button"
                        onMouseDown={(
                          event,
                        ) =>
                          event.preventDefault()
                        }
                        onClick={() => {
                          try {
                            localStorage.removeItem(
                              SEARCH_HISTORY_KEY,
                            );
                          } catch {
                            // Ignore storage errors.
                          }

                          setSearchHistory(
                            [],
                          );
                        }}
                        className="
                          text-[10px]
                          font-semibold
                          text-[#4A1525]
                          hover:underline
                          dark:text-[#E0B85C]
                        "
                      >
                        مسح الكل
                      </button>
                    ) : null}
                  </div>

                  {searchHistory.length >
                  0 ? (
                    <div
                      className="
                        max-h-[260px]
                        overflow-y-auto
                      "
                    >
                      {searchHistory.map(
                        (
                          item,
                        ) => (
                          <button
                            key={item}
                            type="button"
                            onMouseDown={(
                              event,
                            ) =>
                              event.preventDefault()
                            }
                            onClick={() =>
                              selectHistory(
                                item,
                              )
                            }
                            className="
                              group
                              flex
                              w-full
                              items-center
                              gap-3
                              rounded-xl
                              px-3
                              py-2.5
                              text-right
                              transition-colors
                              hover:bg-[#4A1525]/[0.045]
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-inset
                              focus-visible:ring-[#E0B85C]/50
                              dark:hover:bg-[#E0B85C]/[0.06]
                            "
                          >
                            <span
                              className="
                                grid
                                h-8
                                w-8
                                shrink-0
                                place-items-center
                                rounded-lg
                                bg-[#4A1525]/[0.06]
                                text-[#4A1525]/65
                                dark:bg-[#E0B85C]/[0.07]
                                dark:text-[#E0B85C]/70
                              "
                            >
                              <Clock3
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </span>

                            <span
                              className="
                                min-w-0
                                flex-1
                                truncate
                                text-xs
                                font-semibold
                                text-foreground
                              "
                            >
                              {item}
                            </span>

                            <ArrowLeft
                              className="
                                h-4
                                w-4
                                shrink-0
                                text-muted-foreground
                                opacity-0
                                transition-all
                                group-hover:-translate-x-0.5
                                group-hover:opacity-100
                              "
                              aria-hidden="true"
                            />
                          </button>
                        ),
                      )}
                    </div>
                  ) : (
                    <div
                      className="
                        px-4
                        py-6
                        text-center
                        text-[11px]
                        text-muted-foreground
                      "
                    >
                      ابدأ بكتابة اسم المنتج أو الفئة.
                    </div>
                  )}
                </div>
              )}

              {/* زخرفة الهوية */}

              <span
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  -bottom-8
                  -left-8
                  h-20
                  w-20
                  rotate-45
                  border
                  border-[#E0B85C]/[0.055]
                "
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* =====================================================
          خط الهوية السفلي
          ===================================================== */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-0
          bottom-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-[#E0B85C]/25
          to-transparent
        "
      />
    </header>
  );
}

export default SiteHeader;
