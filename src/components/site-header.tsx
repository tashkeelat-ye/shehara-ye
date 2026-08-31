import {
  Link,
  useNavigate,
} from "@tanstack/react-router";
import {
  Moon,
  Search,
  ShoppingCart,
  Sun,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { SideMenu } from "@/components/side-menu";
import { NotificationBell } from "@/components/notification-bell";
import { BrandLogo } from "@/components/brand-logo";
import { useCart } from "@/lib/cart-context";

const THEME_STORAGE_KEY =
  "shehara-theme";

export function SiteHeader() {
  const navigate = useNavigate();

  const {
    count,
    setDrawerOpen,
  } = useCart();

  const [darkMode, setDarkMode] =
    useState(false);

  const [searchValue, setSearchValue] =
    useState("");

  const [searchFocused, setSearchFocused] =
    useState(false);

  useEffect(() => {
    try {
      const savedTheme =
        localStorage.getItem(
          THEME_STORAGE_KEY,
        );

      if (
        savedTheme === "dark" ||
        savedTheme === "light"
      ) {
        const isDark =
          savedTheme === "dark";

        document.documentElement.classList.toggle(
          "dark",
          isDark,
        );

        document.documentElement.style.colorScheme =
          savedTheme;

        document.documentElement.dataset.theme =
          savedTheme;

        setDarkMode(isDark);

        return;
      }
    } catch {
      // التخزين غير متاح.
    }

    const systemDark =
      window.matchMedia?.(
        "(prefers-color-scheme: dark)",
      ).matches ?? false;

    const initialDark =
      document.documentElement.classList.contains(
        "dark",
      ) || systemDark;

    setDarkMode(initialDark);
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !darkMode;

    document.documentElement.classList.toggle(
      "dark",
      nextMode,
    );

    document.documentElement.style.colorScheme =
      nextMode
        ? "dark"
        : "light";

    document.documentElement.dataset.theme =
      nextMode
        ? "dark"
        : "light";

    setDarkMode(nextMode);

    try {
      localStorage.setItem(
        THEME_STORAGE_KEY,
        nextMode
          ? "dark"
          : "light",
      );
    } catch {
      // تجاهل أخطاء التخزين.
    }
  };

  const handleSearch = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const query =
      searchValue.trim();

    if (!query) {
      void navigate({
        to: "/products",
      });

      setSearchFocused(false);

      return;
    }

    void navigate({
      to: "/products",
      search: {
        q: query,
      },
    });

    setSearchFocused(false);
  };

  const clearSearch = () => {
    setSearchValue("");
  };

  return (
    <header
      className="
        sticky
        top-0
        z-50
        w-full
        border-b
        border-[#0E4D64]/10
        bg-[#FAF9F6]/96
        supports-[backdrop-filter]:bg-[#FAF9F6]/82
        backdrop-blur-2xl
        dark:border-white/10
        dark:bg-[#071B24]/96
        dark:supports-[backdrop-filter]:bg-[#071B24]/82
      "
    >
      {/* Safe Area أعلى الشاشة */}
      <div
        aria-hidden="true"
        className="
          h-[env(safe-area-inset-top)]
          min-h-0
          bg-[#0E4D64]
        "
      />

      {/* الشريط الرئيسي */}
      <div
        className="
          relative
          mx-auto
          flex
          h-16
          w-full
          max-w-7xl
          items-center
          px-3
          sm:h-[68px]
          sm:px-5
          lg:px-8
        "
      >
        {/* القائمة */}
        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
          "
        >
          <SideMenu />
        </div>

        {/* الشعار المركزي */}
        <Link
          to="/"
          aria-label="شهارة - الصفحة الرئيسية"
          className="
            absolute
            left-1/2
            top-1/2
            z-10
            flex
            -translate-x-1/2
            -translate-y-1/2
            items-center
            justify-center
            rounded-2xl
            p-1
            transition-transform
            duration-200
            active:scale-90
          "
        >
          <BrandLogo
            size={46}
            priority
            className="
              h-11
              w-11
              sm:h-12
              sm:w-12
            "
          />
        </Link>

        {/* أدوات التطبيق */}
        <div
          className="
            ms-auto
            flex
            items-center
            gap-0.5
          "
        >
          {/* الوضع الليلي */}
          <button
            type="button"
            aria-label={
              darkMode
                ? "تفعيل الوضع الفاتح"
                : "تفعيل الوضع الداكن"
            }
            title={
              darkMode
                ? "الوضع الفاتح"
                : "الوضع الداكن"
            }
            onClick={toggleDarkMode}
            className="
              grid
              h-10
              w-10
              place-items-center
              rounded-xl
              text-[#0E4D64]
              transition-all
              duration-200
              hover:bg-[#0E4D64]/6
              active:scale-90
              dark:text-[#D9EEF5]
              dark:hover:bg-white/6
            "
          >
            {darkMode ? (
              <Sun
                className="h-[19px] w-[19px]"
                strokeWidth={2}
              />
            ) : (
              <Moon
                className="h-[19px] w-[19px]"
                strokeWidth={2}
              />
            )}
          </button>

          {/* الإشعارات */}
          <div
            className="
              grid
              h-10
              w-10
              place-items-center
            "
          >
            <NotificationBell />
          </div>

          {/* السلة */}
          <button
            type="button"
            aria-label="فتح السلة"
            title="السلة"
            onClick={() =>
              setDrawerOpen(true)
            }
            className="
              relative
              grid
              h-10
              w-10
              place-items-center
              rounded-xl
              text-[#0E4D64]
              transition-all
              duration-200
              hover:bg-[#0E4D64]/6
              active:scale-90
              dark:text-[#D9EEF5]
              dark:hover:bg-white/6
            "
          >
            <ShoppingCart
              className="h-5 w-5"
              strokeWidth={2}
            />

            {count > 0 ? (
              <span
                aria-label={`${count} منتج في السلة`}
                className="
                  absolute
                  -end-0.5
                  -top-0.5
                  grid
                  min-h-[18px]
                  min-w-[18px]
                  place-items-center
                  rounded-full
                  border-2
                  border-[#FAF9F6]
                  bg-[#D65A31]
                  px-1
                  text-[8px]
                  font-black
                  leading-none
                  text-white
                  dark:border-[#071B24]
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
        </div>
      </div>

      {/* شريط البحث */}
      <div
        className="
          px-3
          pb-3
          sm:px-5
          lg:px-8
        "
      >
        <form
          onSubmit={handleSearch}
          role="search"
          className="
            mx-auto
            w-full
            max-w-5xl
          "
        >
          <div
            className={`
              relative
              flex
              h-[46px]
              items-center
              overflow-hidden
              rounded-2xl
              border
              bg-white
              transition-all
              duration-200
              dark:bg-[#0B2936]
              ${
                searchFocused
                  ? "border-[#0E4D64] ring-4 ring-[#0E4D64]/8 dark:border-[#D65A31]/60 dark:ring-[#D65A31]/10"
                  : "border-[#0E4D64]/10 dark:border-white/10"
              }
            `}
          >
            {/* أيقونة البحث */}
            <span
              aria-hidden="true"
              className="
                grid
                h-full
                w-11
                shrink-0
                place-items-center
              "
            >
              <Search
                className="
                  h-[18px]
                  w-[18px]
                  text-[#0E4D64]
                  dark:text-[#D65A31]
                "
                strokeWidth={2.1}
              />
            </span>

            {/* الحقل */}
            <input
              value={searchValue}
              onChange={(event) =>
                setSearchValue(
                  event.target.value,
                )
              }
              onFocus={() =>
                setSearchFocused(true)
              }
              onBlur={() =>
                setSearchFocused(false)
              }
              type="search"
              inputMode="search"
              enterKeyHint="search"
              placeholder="ابحث في شهارة عن منتج أو قسم..."
              aria-label="البحث في شهارة"
              autoComplete="off"
              spellCheck={false}
              className="
                h-full
                min-w-0
                flex-1
                border-0
                bg-transparent
                px-1
                text-[13px]
                font-medium
                text-[#081D27]
                outline-none
                placeholder:text-[#71858E]
                dark:text-white
                dark:placeholder:text-[#8EA4AE]
              "
            />

            {/* مسح البحث */}
            {searchValue ? (
              <button
                type="button"
                aria-label="مسح البحث"
                title="مسح البحث"
                onMouseDown={(event) =>
                  event.preventDefault()
                }
                onClick={clearSearch}
                className="
                  me-1
                  grid
                  h-8
                  w-8
                  shrink-0
                  place-items-center
                  rounded-xl
                  text-[#71858E]
                  transition-all
                  hover:bg-[#0E4D64]/6
                  active:scale-90
                  dark:hover:bg-white/6
                "
              >
                <X
                  className="h-4 w-4"
                  strokeWidth={2}
                />
              </button>
            ) : null}

            {/* زر البحث */}
            <button
              type="submit"
              aria-label="تنفيذ البحث"
              title="بحث"
              className="
                me-1
                hidden
                h-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-[#0E4D64]
                px-3
                text-[10px]
                font-black
                text-white
                transition-all
                hover:bg-[#0E4D64]/90
                active:scale-95
                sm:flex
              "
            >
              بحث
            </button>
          </div>
        </form>
      </div>
    </header>
  );
}

export default SiteHeader;
