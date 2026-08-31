import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useRouter } from "@tanstack/react-router";
import {
  BadgeHelp,
  ChevronLeft,
  FileText,
  Grid2x2,
  Home,
  Info,
  LogIn,
  LogOut,
  Menu,
  Package,
  Phone,
  RotateCcw,
  ShieldCheck,
  Truck,
  User,
  Wallet,
  X,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { CurrencySwitcher } from "@/lib/currency-context";
import { useAuth } from "@/lib/auth-context";

const MAIN = [
  {
    to: "/",
    label: "الرئيسية",
    description: "اكتشف أحدث المنتجات",
    Icon: Home,
  },
  {
    to: "/products",
    label: "الفئات والمنتجات",
    description: "تصفح المتجر",
    Icon: Grid2x2,
  },
  {
    to: "/orders",
    label: "طلباتي",
    description: "تابع مشترياتك",
    Icon: Package,
  },
  {
    to: "/account",
    label: "حسابي",
    description: "إدارة حسابك",
    Icon: User,
  },
  {
    to: "/wallet",
    label: "محفظتي",
    description: "الرصيد والمعاملات",
    Icon: Wallet,
  },
] as const;

const PAGES = [
  {
    slug: "about",
    label: "من نحن",
    Icon: Info,
  },
  {
    slug: "contact",
    label: "تواصل معنا",
    Icon: Phone,
  },
  {
    slug: "returns",
    label: "الاستبدال والإرجاع",
    Icon: RotateCcw,
  },
  {
    slug: "privacy",
    label: "سياسة الخصوصية",
    Icon: ShieldCheck,
  },
  {
    slug: "delivery",
    label: "التوصيل",
    Icon: Truck,
  },
  {
    slug: "terms",
    label: "شروط الاستخدام",
    Icon: FileText,
  },
] as const;

export function SideMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
  };

  const menuContent = open ? (
    <div
      className="
        fixed
        inset-0
        z-[99999]
        flex
        justify-start
        dir-rtl
      "
      dir="rtl"
    >
      {/* الخلفية */}
      <button
        type="button"
        aria-label="إغلاق القائمة"
        onClick={closeMenu}
        className="
          fixed
          inset-0
          cursor-default
          bg-[#071E27]/65
          backdrop-blur-[3px]
          animate-in
          fade-in
          duration-200
        "
      />

      {/* القائمة */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="قائمة شهارة"
        className="
          relative
          z-10
          flex
          h-[100dvh]
          w-[88vw]
          max-w-[350px]
          flex-col
          overflow-hidden
          border-e
          border-white/10
          bg-card
          shadow-2xl
          animate-in
          slide-in-from-left
          duration-300
        "
      >
        {/* رأس القائمة */}
        <header
          className="
            relative
            shrink-0
            overflow-hidden
            border-b
            border-border/60
            px-4
            pb-4
            pt-[calc(1rem+env(safe-area-inset-top))]
          "
        >
          {/* لمسة الهوية */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -end-12
              -top-16
              h-36
              w-36
              rounded-full
              bg-[#D65A31]/10
              blur-2xl
            "
          />

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -start-16
              -bottom-20
              h-36
              w-36
              rounded-full
              bg-[#0E4D64]/10
              blur-2xl
            "
          />

          <div
            className="
              relative
              flex
              items-center
              justify-between
              gap-3
            "
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="
                  grid
                  h-11
                  w-11
                  shrink-0
                  place-items-center
                  rounded-2xl
                  border
                  border-border/70
                  bg-white
                  shadow-sm
                "
              >
                <BrandLogo
                  size={36}
                  priority
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2
                    className="
                      truncate
                      text-base
                      font-black
                      tracking-tight
                      text-foreground
                    "
                  >
                    شهارة
                  </h2>

                  <span
                    className="
                      rounded-full
                      bg-[#D65A31]/10
                      px-2
                      py-0.5
                      text-[8px]
                      font-black
                      text-[#D65A31]
                    "
                  >
                    SHOP
                  </span>
                </div>

                <p
                  className="
                    mt-1
                    text-[9px]
                    font-medium
                    text-muted-foreground
                  "
                >
                  تجربة تسوق يمنية حديثة
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="إغلاق القائمة"
              onClick={closeMenu}
              className="
                grid
                h-10
                w-10
                shrink-0
                place-items-center
                rounded-xl
                border
                border-border
                bg-background
                text-foreground
                transition-all
                hover:bg-accent
                active:scale-95
              "
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* المحتوى */}
        <div
          className="
            flex-1
            overflow-y-auto
            overscroll-contain
            px-3
            py-4
            no-scrollbar
          "
        >
          <div className="space-y-5">
            {/* العملة */}
            <section>
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  rounded-2xl
                  border
                  border-border/70
                  bg-secondary/60
                  px-3
                  py-3
                "
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="
                      grid
                      h-9
                      w-9
                      place-items-center
                      rounded-xl
                      bg-primary
                      text-primary-foreground
                    "
                  >
                    ر.ي
                  </span>

                  <div>
                    <p className="text-[10px] font-black text-foreground">
                      العملة
                    </p>

                    <p className="mt-0.5 text-[8px] text-muted-foreground">
                      اختر عملة العرض
                    </p>
                  </div>
                </div>

                <CurrencySwitcher />
              </div>
            </section>

            {/* الرئيسية */}
            <section>
              <div className="mb-2 px-2">
                <p
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    tracking-wider
                    text-muted-foreground
                  "
                >
                  التنقل
                </p>
              </div>

              <nav className="space-y-1">
                {MAIN.map(
                  ({
                    to,
                    label,
                    description,
                    Icon,
                  }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={closeMenu}
                      className="
                        group
                        flex
                        min-h-[58px]
                        items-center
                        gap-3
                        rounded-2xl
                        px-3
                        py-2.5
                        text-foreground
                        transition-all
                        hover:bg-accent
                        active:scale-[0.985]
                      "
                    >
                      <span
                        className="
                          grid
                          h-10
                          w-10
                          shrink-0
                          place-items-center
                          rounded-xl
                          bg-brand-soft
                          text-primary
                          transition-all
                          group-hover:bg-primary
                          group-hover:text-primary-foreground
                        "
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className="
                            block
                            text-xs
                            font-black
                          "
                        >
                          {label}
                        </span>

                        <span
                          className="
                            mt-1
                            block
                            truncate
                            text-[9px]
                            font-medium
                            text-muted-foreground
                          "
                        >
                          {description}
                        </span>
                      </span>

                      <ChevronLeft
                        className="
                          h-4
                          w-4
                          shrink-0
                          text-muted-foreground/50
                          transition-transform
                          group-hover:-translate-x-0.5
                        "
                      />
                    </Link>
                  ),
                )}
              </nav>
            </section>

            {/* صفحات المتجر */}
            <section>
              <div
                className="
                  mb-2
                  border-t
                  border-border/60
                  pt-4
                "
              >
                <p
                  className="
                    px-2
                    text-[9px]
                    font-black
                    uppercase
                    tracking-wider
                    text-muted-foreground
                  "
                >
                  معلومات شهارة
                </p>
              </div>

              <nav className="space-y-1">
                {PAGES.map(
                  ({
                    slug,
                    label,
                    Icon,
                  }) => (
                    <Link
                      key={slug}
                      to="/page/$slug"
                      params={{ slug }}
                      onClick={closeMenu}
                      className="
                        group
                        flex
                        min-h-11
                        items-center
                        gap-3
                        rounded-xl
                        px-3
                        py-2
                        text-foreground
                        transition-all
                        hover:bg-accent
                        active:scale-[0.985]
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
                          bg-secondary
                          text-primary
                        "
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      <span
                        className="
                          min-w-0
                          flex-1
                          text-[10px]
                          font-bold
                        "
                      >
                        {label}
                      </span>

                      <ChevronLeft
                        className="
                          h-3.5
                          w-3.5
                          shrink-0
                          text-muted-foreground/40
                        "
                      />
                    </Link>
                  ),
                )}

                <Link
                  to="/faq"
                  onClick={closeMenu}
                  className="
                    group
                    flex
                    min-h-11
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-2
                    text-foreground
                    transition-all
                    hover:bg-accent
                    active:scale-[0.985]
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
                      bg-secondary
                      text-primary
                    "
                  >
                    <BadgeHelp className="h-4 w-4" />
                  </span>

                  <span
                    className="
                      min-w-0
                      flex-1
                      text-[10px]
                      font-bold
                    "
                  >
                    الأسئلة الشائعة
                  </span>

                  <ChevronLeft
                    className="
                      h-3.5
                      w-3.5
                      shrink-0
                      text-muted-foreground/40
                    "
                  />
                </Link>
              </nav>
            </section>
          </div>
        </div>

        {/* أسفل القائمة */}
        <footer
          className="
            shrink-0
            border-t
            border-border/60
            bg-card
            px-3
            pt-3
            pb-[calc(0.75rem+env(safe-area-inset-bottom))]
          "
        >
          {user ? (
            <button
              type="button"
              onClick={async () => {
                await signOut();
                closeMenu();

                await router.navigate({
                  to: "/",
                });
              }}
              className="
                flex
                min-h-12
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                border
                border-destructive/20
                bg-destructive/10
                px-4
                text-xs
                font-black
                text-destructive
                transition-all
                hover:bg-destructive/15
                active:scale-[0.98]
              "
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={closeMenu}
              className="
                flex
                min-h-12
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-primary
                px-4
                text-xs
                font-black
                text-primary-foreground
                shadow-sm
                transition-all
                hover:opacity-95
                active:scale-[0.98]
              "
            >
              <LogIn className="h-4 w-4" />
              تسجيل الدخول
            </Link>
          )}

          <p
            className="
              mt-2
              text-center
              text-[7px]
              font-medium
              text-muted-foreground
            "
          >
            شهارة — تسوق بثقة
          </p>
        </footer>
      </aside>
    </div>
  ) : null;

  return (
    <>
      {/* زر فتح القائمة */}
      <button
        type="button"
        aria-label="فتح قائمة شهارة"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="
          grid
          h-10
          w-10
          shrink-0
          place-items-center
          rounded-xl
          border
          border-transparent
          text-foreground
          transition-all
          hover:border-border
          hover:bg-accent
          active:scale-95
        "
      >
        <Menu className="h-5 w-5" />
      </button>

      {mounted && menuContent
        ? createPortal(
            menuContent,
            document.body,
          )
        : null}
    </>
  );
}

export default SideMenu;
