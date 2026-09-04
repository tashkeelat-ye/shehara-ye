import { Link, useNavigate } from "@tanstack/react-router";
import {
  Moon,
  Search,
  ShoppingCart,
  Sun,
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

const THEME_STORAGE_KEY = "shehara-theme";

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
        document.documentElement.classList.toggle(
          "dark",
          savedTheme === "dark",
        );

        document.documentElement.style.colorScheme =
          savedTheme;

        setDarkMode(
          savedTheme === "dark",
        );

        return;
      }
    } catch {
      // التخزين غير متاح.
    }

    setDarkMode(
      document.documentElement.classList.contains(
        "dark",
      ),
    );
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !darkMode;

    document.documentElement.classList.toggle(
      "dark",
      nextMode,
    );

    document.documentElement.style.colorScheme =
      nextMode ? "dark" : "light";

    document.documentElement.dataset["theme"] =
      nextMode ? "dark" : "light";

    setDarkMode(nextMode);

    try {
      localStorage.setItem(
        THEME_STORAGE_KEY,
        nextMode ? "dark" : "light",
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

      return;
    }

    void navigate({
      to: "/products",
      search: {
        q: query,
      },
    });
  };

  return (
    <header
      className="
        sticky
        top-0
        z-50
        w-full
        border-b
        border-[color:var(--border)]
        bg-[color:var(--background)]/95
        shadow-[0_4px_20px_-18px_rgba(14,77,100,0.45)]
        backdrop-blur-xl
        supports-[backdrop-filter]:bg-[color:var(--background)]/80
      "
    >
      <div
        className="
          relative
          mx-auto
          flex
          h-[68px]
          w-full
          max-w-7xl
          items-center
          justify-between
          px-3
          sm:px-5
          lg:px-8
        "
      >
        {/* القائمة */}
        <div className="shrink-0">
          <SideMenu />
        </div>

        {/* الشعار المركزي */}
        <Link
          to="/"
          aria-label="شهارة - تسوق بلا حدود"
          className="
            absolute
            left-1/2
            top-1/2
            flex
            -translate-x-1/2
            -translate-y-1/2
            items-center
            justify-center
          "
        >
          <BrandLogo
            size={52}
            className="
              h-11
              w-11
              sm:h-12
              sm:w-12
            "
            priority
          />
        </Link>

        {/* الأدوات */}
        <div
          className="
            ms-auto
            flex
            items-center
            gap-1
          "
        >
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
              text-primary
              transition-all
              duration-200
              hover:bg-accent
              hover:text-accent-solid
              active:scale-90
            "
          >
            {darkMode ? (
              <Sun
                size={20}
                strokeWidth={2}
              />
            ) : (
              <Moon
                size={20}
                strokeWidth={2}
              />
            )}
          </button>

          <NotificationBell />

          <button
            type="button"
            aria-label="السلة"
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
              text-primary
              transition-all
              duration-200
              hover:bg-accent
              hover:text-accent-solid
              active:scale-90
            "
          >
            <ShoppingCart
              size={20}
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
                  min-h-4
                  min-w-4
                  place-items-center
                  rounded-full
                  bg-accent-solid
                  px-1
                  text-[8px]
                  font-extrabold
                  leading-none
                  text-white
                  shadow-sm
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

      {/* البحث */}
      <div
        className="
          border-t
          border-[color:var(--border)]/70
          bg-[color:var(--background)]
          px-3
          py-3
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
            max-w-4xl
          "
        >
          <div
            className="
              relative
              overflow-hidden
              rounded-2xl
              border
              border-[color:var(--border)]
              bg-white
              shadow-[0_8px_24px_-20px_rgba(14,77,100,0.6)]
              transition-all
              duration-200
              focus-within:border-[#0E4D64]
              focus-within:ring-4
              focus-within:ring-[#0E4D64]/10
              dark:bg-[color:var(--card)]
            "
          >
            <Search
              size={19}
              strokeWidth={2}
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                start-4
                top-1/2
                -translate-y-1/2
                text-[#0E4D64]
              "
            />

            <input
              value={searchValue}
              onChange={(event) =>
                setSearchValue(
                  event.target.value,
                )
              }
              type="search"
              placeholder="ابحث عن منتج، عسل، بن، عطور، إلكترونيات..."
              aria-label="البحث عن المنتجات"
              autoComplete="off"
              className="
                h-12
                w-full
                border-0
                bg-transparent
                pe-4
                ps-12
                text-sm
                font-medium
                text-foreground
                outline-none
                placeholder:text-muted-foreground
              "
            />
          </div>
        </form>
      </div>
    </header>
  );
}
