import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useRouter } from "@tanstack/react-router";
import {
  BadgeHelp,
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
  { to: "/", label: "الرئيسية", Icon: Home },
  { to: "/products", label: "الفئات والمنتجات", Icon: Grid2x2 },
  { to: "/orders", label: "طلباتي", Icon: Package },
  { to: "/account", label: "حسابي", Icon: User },
  { to: "/wallet", label: "محفظتي", Icon: Wallet },
] as const;

const PAGES = [
  { slug: "about", label: "من نحن", Icon: Info },
  { slug: "contact", label: "تواصل معنا", Icon: Phone },
  { slug: "returns", label: "سياسة الاستبدال والإرجاع", Icon: RotateCcw },
  { slug: "privacy", label: "سياسة الخصوصية", Icon: ShieldCheck },
  { slug: "delivery", label: "التوصيل", Icon: Truck },
  { slug: "terms", label: "شروط الاستخدام", Icon: FileText },
] as const;

export function SideMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const menuContent = open ? (
    <div className="fixed inset-0 z-[99999] flex justify-start dir-rtl">
      {/* الخلفية المعتمة */}
      <button
        type="button"
        aria-label="إغلاق القائمة"
        onClick={() => setOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* لوحة القائمة الجانبية بارتفاع الشاشة الكامل 100dvh */}
      <aside className="relative z-10 flex h-[100dvh] w-[82vw] max-w-[320px] flex-col bg-card shadow-2xl">
        {/* الهيدر الثابت أعلى القائمة */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <BrandLogo size={32} />
            <p className="truncate text-base font-bold text-foreground">تشكيلات</p>
          </div>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={() => setOpen(false)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border text-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* الجزء الأوسط القابل للتمرير سكرول */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* تبديل العملة */}
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-accent/30 p-3">
            <span className="text-xs font-medium text-muted-foreground">العملة</span>
            <CurrencySwitcher />
          </div>

          {/* الروابط الرئيسية */}
          <nav className="space-y-1">
            {MAIN.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent active:bg-accent/80"
              >
                <Icon className="h-4.5 w-4.5 text-primary shrink-0" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="border-t border-border/60" />

          {/* صفحات المتجر */}
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-semibold text-muted-foreground">صفحات المتجر</p>
            <nav className="mt-1 space-y-1">
              {PAGES.map(({ slug, label, Icon }) => (
                <Link
                  key={slug}
                  to="/page/$slug"
                  params={{ slug }}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent active:bg-accent/80"
                >
                  <Icon className="h-4.5 w-4.5 text-primary shrink-0" />
                  <span>{label}</span>
                </Link>
              ))}
              <Link
                to="/faq"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent active:bg-accent/80"
              >
                <BadgeHelp className="h-4.5 w-4.5 text-primary shrink-0" />
                <span>الأسئلة الشائعة</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* الجزء السفلي الثابت بالأسفل لتسجيل الدخول / الخروج */}
        <div className="shrink-0 border-t border-border/60 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-card">
          {user ? (
            <button
              type="button"
              onClick={async () => {
                await signOut();
                setOpen(false);
                await router.navigate({ to: "/" });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 px-3 py-3 text-sm font-bold transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              <LogIn className="h-4 w-4" />
              <span>تسجيل الدخول</span>
            </Link>
          )}
        </div>
      </aside>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        aria-label="القائمة"
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent active:scale-95"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* زرع القائمة بالكامل في أعلى طبقة بالصفحة */}
      {mounted && menuContent ? createPortal(menuContent, document.body) : null}
    </>
  );
}
