import { useEffect, useState } from "react";
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
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="القائمة"
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="إغلاق القائمة"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 end-0 flex w-[min(19rem,88vw)] flex-col overflow-y-auto bg-card p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <BrandLogo size={40} />
                <p className="truncate text-sm text-foreground">تشكيلات</p>
              </div>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-border/70 p-3">
              <span className="text-[11px] text-muted-foreground">العملة</span>
              <CurrencySwitcher />
            </div>

            <nav className="mt-4 space-y-1">
              {MAIN.map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-accent"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </Link>
              ))}
            </nav>

            <p className="mt-4 px-3 text-[11px] text-muted-foreground">صفحات المتجر</p>
            <nav className="mt-1 space-y-1">
              {PAGES.map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-accent"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto pt-5">
              {user ? (
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    setOpen(false);
                    await router.navigate({ to: "/" });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-3 text-sm text-primary-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-3 text-sm text-primary-foreground"
                >
                  <LogIn className="h-4 w-4" />
                  تسجيل الدخول
                </Link>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
