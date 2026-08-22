import { Link } from "@tanstack/react-router";
import {
  Search,
  User,
  Heart,
} from "lucide-react";
import { useState } from "react";

import { SideMenu } from "@/components/side-menu";

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false);

  const navItems = [
    {
      to: "/",
      label: "الرئيسية",
    },
    {
      to: "/products",
      label: "المنتجات",
    },
    {
      to: "/favorites",
      label: "المفضلة",
    },
  ] as const;

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
      <div
        className="
          mx-auto
          flex
          h-16
          w-full
          max-w-7xl
          items-center
          gap-3
          px-4
          sm:px-6
          lg:px-8
        "
      >
        {/* =====================================================
            القائمة الجانبية
            ===================================================== */}

        <div className="shrink-0">
          <SideMenu />
        </div>

        {/* =====================================================
            الشعار
            ===================================================== */}

        <Link
          to="/"
          aria-label="تشكيلات للتسوق"
          className="flex min-w-0 items-center gap-2"
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

          <span className="hidden leading-none sm:block">
            <span
              className="
                block
                text-base
                font-bold
                text-[color:var(--brand-burgundy)]
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

        {/* =====================================================
            التنقل الرئيسي — سطح المكتب
            ===================================================== */}

        <nav
          className="
            hidden
            items-center
            gap-1
            md:flex
          "
          aria-label="التنقل الرئيسي"
        >
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="
                rounded-xl
                px-4
                py-2
                text-sm
                font-medium
                text-[color:var(--foreground)]
                transition
                hover:bg-[color:var(--brand-gold)]/10
                hover:text-[color:var(--brand-burgundy)]
              "
              activeProps={{
                className:
                  "rounded-xl bg-[color:var(--brand-burgundy)] px-4 py-2 text-sm font-semibold text-white shadow-sm",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* =====================================================
            الأدوات
            ===================================================== */}

        <div
          className="
            ms-auto
            flex
            items-center
            gap-1
          "
        >
          {/* البحث */}

          <button
            type="button"
            aria-label="البحث"
            aria-expanded={searchOpen}
            onClick={() =>
              setSearchOpen((value) => !value)
            }
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
            "
          >
            <Search size={20} />
          </button>

          {/* المفضلة */}

          <Link
            to="/favorites"
            aria-label="المفضلة"
            className="
              hidden
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              text-[color:var(--brand-burgundy)]
              transition
              hover:bg-[color:var(--brand-gold)]/10
              sm:inline-flex
            "
            activeProps={{
              className:
                "hidden h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--brand-burgundy)] text-white sm:inline-flex",
            }}
          >
            <Heart size={20} />
          </Link>

          {/* الحساب */}

          <Link
            to="/account"
            aria-label="الحساب"
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
            "
            activeProps={{
              className:
                "inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--brand-burgundy)] text-white",
            }}
          >
            <User size={20} />
          </Link>
        </div>
      </div>

      {/* =======================================================
          شريط البحث
          ======================================================= */}

      {searchOpen && (
        <div
          className="
            border-t
            border-[color:var(--brand-gold)]/15
            bg-[color:var(--background)]
            px-4
            py-3
          "
        >
          <form
            action="/products"
            method="get"
            className="
              mx-auto
              flex
              max-w-3xl
              items-center
              gap-2
            "
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="
                  pointer-events-none
                  absolute
                  start-3
                  top-1/2
                  -translate-y-1/2
                  text-muted-foreground
                "
              />

              <input
                name="search"
                type="search"
                autoFocus
                placeholder="ابحث عن منتج..."
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
                  outline-none
                  transition
                  focus:border-[color:var(--brand-gold-deep)]
                  focus:ring-2
                  focus:ring-[color:var(--brand-gold)]/20
                "
              />
            </div>

            <button
              type="submit"
              className="
                h-11
                rounded-xl
                bg-[color:var(--brand-burgundy)]
                px-5
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-[color:var(--brand-burgundy-deep)]
              "
            >
              بحث
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
