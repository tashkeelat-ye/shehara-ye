import { Link } from "@tanstack/react-router";
import {
  Bell,
  Moon,
  Search,
  ShoppingCart,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";

import { SideMenu } from "@/components/side-menu";

export function SiteHeader() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark =
      document.documentElement.classList.contains("dark");

    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !darkMode;

    document.documentElement.classList.toggle(
      "dark",
      nextMode,
    );

    setDarkMode(nextMode);

    try {
      localStorage.setItem(
        "tashkilat-theme",
        nextMode ? "dark" : "light",
      );
    } catch {
      // تجاهل أخطاء التخزين المحلي
    }
  };

  return (
    <header
      className="
        sticky
        top-0
        z-50
        w-full
        border-b
        border-[color:var(--brand-gold)]/20
        bg-[color:var(--background)]/95
        backdrop-blur-md
        supports-[backdrop-filter]:bg-[color:var(--background)]/80
      "
    >
      {/* =====================================================
          القائمة العلوية
          ===================================================== */}

      <div
        className="
          mx-auto
          flex
          h-16
          w-full
          max-w-7xl
          items-center
          gap-2
          px-3
          sm:px-5
          lg:px-8
        "
      >
        {/* القائمة الجانبية الحالية */}

        <div className="shrink-0">
          <SideMenu />
        </div>

        {/* الشعار */}

        <Link
          to="/"
          aria-label="تشكيلات للتسوق"
          className="
            flex
            min-w-0
            shrink-0
            items-center
            gap-2
          "
        >
          <span
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-[color:var(--brand-burgundy)]
              text-[color:var(--brand-gold)]
              shadow-sm
            "
          >
            <span
              className="
                text-lg
                font-extrabold
                leading-none
              "
            >
              ت
            </span>
          </span>

          <span
            className="
              hidden
              leading-none
              sm:block
            "
          >
            <span
              className="
                block
                text-base
                font-bold
                text-[color:var(--brand-burgundy)]
                dark:text-[color:var(--brand-gold)]
              "
            >
              تشكيلات
            </span>

            <span
              className="
                mt-1
                block
                text-[10px]
                font-medium
                text-[color:var(--brand-gold-deep)]
              "
            >
              للتسوق
            </span>
          </span>
        </Link>

        <div className="flex-1" />

        {/* ===================================================
            أدوات القائمة العلوية
            =================================================== */}

        <div
          className="
            flex
            shrink-0
            items-center
            gap-1
          "
        >
          {/* الوضع الداكن */}

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
              inline-flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              text-[color:var(--brand-burgundy)]
              transition
              hover:bg-[color:var(--brand-gold)]/10
              dark:text-[color:var(--brand-gold)]
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

          {/* الإشعارات */}

          <button
            type="button"
            aria-label="الإشعارات"
            title="الإشعارات"
            className="
              relative
              inline-flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              text-[color:var(--brand-burgundy)]
              transition
              hover:bg-[color:var(--brand-gold)]/10
              dark:text-[color:var(--brand-gold)]
            "
          >
            <Bell
              size={20}
              strokeWidth={2}
            />
          </button>

          {/* السلة */}

          <Link
            to="/cart"
            aria-label="السلة"
            title="السلة"
            className="
              inline-flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              text-[color:var(--brand-burgundy)]
              transition
              hover:bg-[color:var(--brand-gold)]/10
              dark:text-[color:var(--brand-gold)]
            "
          >
            <ShoppingCart
              size={20}
              strokeWidth={2}
            />
          </Link>
        </div>
      </div>

      {/* =====================================================
          نافذة البحث
          ===================================================== */}

      <div
        className="
          border-t
          border-[color:var(--brand-gold)]/10
          bg-[color:var(--background)]
          px-3
          py-3
          sm:px-5
          lg:px-8
        "
      >
        <form
          action="/products"
          method="get"
          role="search"
          className="
            mx-auto
            w-full
            max-w-7xl
          "
        >
          <div className="relative">
            <Search
              size={19}
              strokeWidth={2}
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                start-3
                top-1/2
                -translate-y-1/2
                text-[color:var(--muted-foreground)]
              "
            />

            <input
              name="search"
              type="search"
              placeholder="ابحث عن المنتجات..."
              aria-label="البحث عن المنتجات"
              className="
                h-11
                w-full
                rounded-xl
                border
                border-[color:var(--border)]
                bg-[color:var(--card)]
                pe-4
                ps-10
                text-sm
                text-[color:var(--foreground)]
                outline-none
                transition
                placeholder:text-[color:var(--muted-foreground)]
                focus:border-[color:var(--brand-gold-deep)]
                focus:ring-2
                focus:ring-[color:var(--brand-gold)]/20
              "
            />
          </div>
        </form>
      </div>
    </header>
  );
}
