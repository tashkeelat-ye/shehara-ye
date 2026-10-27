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
  Moon,
  Package,
  Phone,
  RotateCcw,
  ShieldCheck,
  Sun,
  Truck,
  User,
  Wallet,
  X,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { useCurrency } from "@/lib/currency-context";
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
  { slug: "delivery", label: "التوصيل والشحن", Icon: Truck },
  { slug: "terms", label: "شروط الاستخدام", Icon: FileText },
] as const;

export function SideMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { user, signOut } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    document.documentElement.dataset.theme = next ? "dark" : "light";
    setIsDark(next);
    try {
      localStorage.setItem("shehara-theme", next ? "dark" : "light");
    } catch {}
  };

  const menu = open ? (
    <div
      dir="rtl"
      className="fixed inset-0 z-[99999] flex"
      role="dialog"
      aria-modal="true"
      aria-label="القائمة الرئيسية"
    >
      <button
        type="button"
        aria-label="إغلاق القائمة"
        onClick={() => setOpen(false)}
        className="fixed inset-0 bg-[#071B24]/60 backdrop-blur-[4px] transition-opacity"
      />

      <aside className="relative z-10 flex h-[100dvh] w-[86vw] max-w-[340px] flex-col overflow-hidden border-s border-[#0E4D64]/10 bg-white shadow-[24px_0_60px_-20px_rgba(7,27,36,0.6)] dark:border-white/10 dark:bg-[#071E28]">
        {/* شريط الهوية العلوي المتدرج */}
        <div
          aria-hidden="true"
          className="h-1.5 w-full bg-gradient-to-l from-[#0E4D64] via-[#D65A31] to-[#0E4D64]"
        />

        {/* رأس القائمة */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-5 pt-[env(safe-area-inset-top)] dark:border-white/[0.08]">
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="flex min-w-0 items-center gap-3"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#0E4D64]/10 bg-[#EBF2F5] p-1.5 shadow-sm dark:border-white/10 dark:bg-[#0E4D64]/20">
              <BrandLogo size={38} className="h-9 w-9 object-contain" />
            </span>
            <div className="min-w-0">
              <span className="block text-base font-black text-slate-900 dark:text-white">
                شهارة
              </span>
              <span className="block text-[11px] font-bold text-[#D65A31]">
                تسوّق بلا حدود
              </span>
            </div>
          </Link>

          <button
            type="button"
            aria-label="إغلاق"
            onClick={() => setOpen(false)}
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200/80 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-[#D65A31] dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* محتوى القائمة القابل للتمرير */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 no-scrollbar">
          {/* محول العملة المقسم Segmented Control */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                العملة
              </p>
              <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                اختر عملة العرض
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-200/60 p-1 dark:bg-black/30">
              <button
                type="button"
                onClick={() => setCurrency("YER")}
                className={`rounded-lg py-1.5 text-xs font-black transition-all ${
                  currency === "YER"
                    ? "bg-[#0E4D64] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                ريال يمني (ر.ي)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("SAR")}
                className={`rounded-lg py-1.5 text-xs font-black transition-all ${
                  currency === "SAR"
                    ? "bg-[#0E4D64] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                ريال سعودي (ر.س)
              </button>
            </div>
          </div>

          {/* روابط التنقل الرئيسية في بطاقات مستديرة */}
          <nav className="space-y-2" aria-label="روابط المتجر">
            {MAIN.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 text-sm font-black text-slate-800 shadow-sm transition hover:border-[#0E4D64]/30 hover:bg-[#EBF2F5]/50 active:scale-[0.99] dark:border-white/[0.08] dark:bg-[#0A2A38] dark:text-slate-100 dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64] transition group-hover:bg-[#D65A31]/10 group-hover:text-[#D65A31] dark:bg-white/10 dark:text-[#8DC1CC]">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">{label}</span>
                <ChevronLeft className="h-4 w-4 text-slate-400 transition group-hover:-translate-x-0.5 group-hover:text-[#0E4D64] dark:text-slate-500" />
              </Link>
            ))}
          </nav>

          {/* مفتاح تبديل الوضع الليلي / الفاتح */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#0A2A38] dark:text-slate-100 dark:hover:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </span>
              <span>{isDark ? "الوضع الليلي (مفعّل)" : "الوضع الفاتح (مفعّل)"}</span>
            </div>
            <div
              className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
                isDark ? "bg-[#0E4D64]" : "bg-slate-300"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  isDark ? "-translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
          </button>

          {/* فاصل وصفحات المتجر */}
          <div className="pt-2">
            <p className="px-2 text-[11px] font-black tracking-wide text-slate-400 dark:text-slate-500">
              صفحات المتجر والسياسات
            </p>
            <div className="mt-2 space-y-1">
              {PAGES.map(({ slug, label, Icon }) => (
                <Link
                  key={slug}
                  to="/page/$slug"
                  params={{ slug }}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#0E4D64] dark:text-[#8DC1CC]" />
                  <span className="min-w-0 flex-1">{label}</span>
                  <ChevronLeft className="h-3.5 w-3.5 text-slate-400/50" />
                </Link>
              ))}
              <Link
                to="/faq"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
              >
                <BadgeHelp className="h-4 w-4 shrink-0 text-[#0E4D64] dark:text-[#8DC1CC]" />
                <span className="min-w-0 flex-1">الأسئلة الشائعة</span>
                <ChevronLeft className="h-3.5 w-3.5 text-slate-400/50" />
              </Link>
            </div>
          </div>
        </div>

        {/* الشريط السفلي وزر تسجيل الدخول / الخروج */}
        <div className="shrink-0 border-t border-slate-100 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-white/[0.08] dark:bg-[#071E28]">
          {user ? (
            <button
              type="button"
              onClick={async () => {
                await signOut();
                setOpen(false);
                await router.navigate({ to: "/" });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 py-3 text-sm font-black text-rose-600 transition hover:bg-rose-100 active:scale-[0.98] dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج من الحساب
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0E4D64] py-3 text-sm font-black text-white shadow-lg transition hover:bg-[#093747] active:scale-[0.98]"
            >
              <LogIn className="h-4 w-4" />
              تسجيل الدخول / إنشاء حساب
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
        aria-label="فتح القائمة"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-2xl text-[#0E4D64] transition hover:bg-[#0E4D64]/10 hover:text-[#D65A31] active:scale-95 dark:text-white"
      >
        <Menu className="h-5 w-5" strokeWidth={2.2} />
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
  );
}

export default SideMenu;
