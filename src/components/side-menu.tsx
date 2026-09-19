import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useRouter } from "@tanstack/react-router";
import {
  BadgeHelp, ChevronLeft, FileText, Grid2x2, Home, Info, LogIn,
  LogOut, Menu, Package, Phone, RotateCcw, ShieldCheck, Truck, User,
  Wallet, X,
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

  useEffect(() => setMounted(true), []);

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

  const menu = open ? (
    <div dir="rtl" className="fixed inset-0 z-[99999] flex" role="dialog" aria-modal="true" aria-label="القائمة الرئيسية">
      <button
        type="button"
        aria-label="إغلاق القائمة"
        onClick={() => setOpen(false)}
        className="fixed inset-0 bg-[#071B24]/60 backdrop-blur-[3px]"
      />

      <aside className="relative z-10 flex h-[100dvh] w-[88vw] max-w-[350px] flex-col overflow-hidden border-s border-[#0E4D64]/[0.08] bg-[color:var(--background)] shadow-[18px_0_70px_-35px_rgba(7,27,36,0.7)]">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-[#0E4D64] via-[#D65A31] to-[#0E4D64]" />

        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-border/60 px-4 pt-[env(safe-area-inset-top)]">
          <Link to="/" onClick={() => setOpen(false)} className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#0E4D64]/[0.08] bg-white shadow-[0_12px_30px_-24px_rgba(14,77,100,0.9)] dark:bg-white/[0.04]">
              <BrandLogo size={42} className="h-10 w-10" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-foreground">شهارة</span>
              <span className="block text-[10px] font-bold text-muted-foreground">تسوق بلا حدود</span>
            </span>
          </Link>

          <button type="button" aria-label="إغلاق" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-border/70 text-foreground hover:bg-accent hover:text-[#D65A31]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-[1.35rem] border border-[#0E4D64]/[0.07] bg-[#F7F9FA] p-3 dark:border-white/[0.07] dark:bg-white/[0.035]">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground">العملة</p>
              <p className="mt-0.5 text-xs font-black text-foreground">اختر عملة العرض</p>
            </div>
            <CurrencySwitcher />
          </div>

          <nav className="space-y-1.5" aria-label="روابط المتجر">
            {MAIN.map(({ to, label, Icon }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-[1.15rem] border border-transparent px-3.5 py-3 text-sm font-bold text-foreground transition-all hover:border-[#0E4D64]/[0.07] hover:bg-[#0E4D64]/[0.045]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0E4D64]/[0.07] text-[#0E4D64] group-hover:bg-[#D65A31]/10 group-hover:text-[#D65A31] dark:text-[#8DC1CC]">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">{label}</span>
                <ChevronLeft className="h-4 w-4 text-muted-foreground/45" />
              </Link>
            ))}
          </nav>

          <div className="my-5 h-px bg-border/70" />

          <p className="px-3 text-[10px] font-black tracking-wide text-muted-foreground">صفحات المتجر</p>
          <nav className="mt-2 space-y-1" aria-label="صفحات المتجر">
            {PAGES.map(({ slug, label, Icon }) => (
              <Link key={slug} to="/page/$slug" params={{ slug }} onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-accent">
                <Icon className="h-[17px] w-[17px] shrink-0 text-[#0E4D64] dark:text-[#8DC1CC]" />
                <span className="min-w-0 flex-1">{label}</span>
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/35" />
              </Link>
            ))}
            <Link to="/faq" onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-accent">
              <BadgeHelp className="h-[17px] w-[17px] shrink-0 text-[#0E4D64] dark:text-[#8DC1CC]" />
              <span className="min-w-0 flex-1">الأسئلة الشائعة</span>
              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/35" />
            </Link>
          </nav>
        </div>

        <div className="shrink-0 border-t border-border/60 bg-[color:var(--background)]/96 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {user ? (
            <button type="button" onClick={async () => { await signOut(); setOpen(false); await router.navigate({ to: "/" }); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-3 text-sm font-black text-destructive hover:opacity-90 active:scale-[0.98]">
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </button>
          ) : (
            <Link to="/auth" onClick={() => setOpen(false)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0E4D64] px-3 py-3 text-sm font-black text-white shadow-[0_14px_28px_-20px_rgba(14,77,100,0.95)] hover:bg-[#0A3D50] active:scale-[0.98]">
              <LogIn className="h-4 w-4" />
              تسجيل الدخول
            </Link>
          )}
        </div>
      </aside>
    </div>
  ) : null;

  return (
    <>
      <button type="button" aria-label="فتح القائمة" aria-expanded={open} onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-2xl text-[#0E4D64] hover:bg-[#0E4D64]/[0.07] hover:text-[#D65A31] active:scale-95 dark:text-[#DDECF0]">
        <Menu className="h-[21px] w-[21px]" strokeWidth={2.1} />
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
  );
}

export default SideMenu;
