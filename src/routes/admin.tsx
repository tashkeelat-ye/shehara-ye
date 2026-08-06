import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  FileText,
  LayoutGrid,
  Image,
  ListOrdered,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  Bell,
  Bike,
  MessagesSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
import { ensureAdminAccount, ADMIN_EMAIL_DOMAIN } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "لوحة تحكم الإدارة | تشكيلات" },
      { name: "description", content: "لوحة تحكم إدارة متجر تشكيلات." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "لوحة تحكم الإدارة | تشكيلات" },
      { property: "og:description", content: "منطقة إدارة متجر تشكيلات." },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "نظرة عامة", icon: LayoutGrid, exact: true },
  { to: "/admin/products", label: "المنتجات", icon: Package },
  { to: "/admin/categories", label: "الفئات", icon: LayoutGrid },
  { to: "/admin/banners", label: "الإعلانات والعروض", icon: Image },
  { to: "/admin/orders", label: "الطلبات", icon: ListOrdered },
  { to: "/admin/payment-requests", label: "طلبات الدفع المعلّقة", icon: ReceiptText },
  { to: "/admin/payments", label: "طرق الدفع", icon: CreditCard },
  { to: "/admin/users", label: "المستخدمون والتجار", icon: Users },
  { to: "/admin/couriers", label: "عمال التوصيل", icon: Bike },
  { to: "/admin/support", label: "محادثات العملاء", icon: MessagesSquare },
  { to: "/admin/notifications", label: "الإشعارات", icon: Bell },
  { to: "/admin/content", label: "إدارة المحتوى", icon: FileText },
  { to: "/admin/settings", label: "إعدادات المتجر", icon: Settings },
] as const;

function AdminLayout() {
  const [state, setState] = useState<"loading" | "guest" | "denied" | "admin">("loading");
  const navigate = useNavigate();

  const check = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setState("guest");
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .returns<{ role: string }[]>();
    setState(roles && roles.length > 0 ? "admin" : "denied");
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  if (state === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="text-sm text-muted-foreground">جارٍ التحقق من الصلاحيات...</p>
      </div>
    );
  }

  if (state !== "admin") {
    return <AdminLogin denied={state === "denied"} onSuccess={check} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <BrandLogo size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">لوحة تحكم تشكيلات</p>
              <p className="truncate text-[11px] text-muted-foreground">إدارة المتجر بالكامل</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-xl border border-border px-3 py-2 text-xs text-foreground">
              المتجر
            </Link>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                setState("guest");
                void navigate({ to: "/admin", replace: true });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs text-primary-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl gap-4 px-4 py-4 md:flex">
        <nav className="mb-4 md:mb-0 md:w-56 md:shrink-0">
          <ul className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
            {NAV.map((n) => (
              <li key={n.to} className="shrink-0 md:shrink">
                <Link
                  to={n.to}
                  activeOptions={{ exact: "exact" in n ? n.exact : false }}
                  activeProps={{ className: "bg-brand-soft text-primary" }}
                  inactiveProps={{ className: "text-muted-foreground" }}
                  className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-border/70 px-3 py-2 text-xs md:w-full"
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 flex-1 pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminLogin({ denied, onSuccess }: { denied: boolean; onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void ensureAdminAccount({ data: undefined }).catch(() => undefined);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const clean = username.trim().toLowerCase();
    if (!clean || !password) {
      setError("أدخل اسم المستخدم وكلمة المرور");
      return;
    }
    setBusy(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: `${clean}@${ADMIN_EMAIL_DOMAIN}`,
      password,
    });
    if (signInError || !data.user) {
      setBusy(false);
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .returns<{ role: string }[]>();
    setBusy(false);
    if (!roles || roles.length === 0) {
      await supabase.auth.signOut();
      setError("هذا الحساب لا يملك صلاحية الدخول للوحة التحكم");
      return;
    }
    onSuccess();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandLogo size={72} />
          <h1 className="text-base text-foreground">دخول الإدارة</h1>
          <p className="text-[11px] text-muted-foreground">
            هذه الصفحة مخصّصة لإدارة المتجر فقط وليست لحسابات العملاء أو التجار.
          </p>
        </div>

        {denied ? (
          <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-[11px] text-destructive">
            حسابك الحالي ليس حساب إدارة. سجّل الخروج ثم ادخل ببيانات الإدارة.
          </p>
        ) : null}

        <form onSubmit={submit} className="mt-5 space-y-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="اسم المستخدم"
            aria-label="اسم المستخدم"
            autoComplete="username"
            dir="ltr"
            maxLength={40}
            className="h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            aria-label="كلمة المرور"
            autoComplete="current-password"
            dir="ltr"
            maxLength={100}
            className="h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-primary"
          />
          {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm text-primary-foreground disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" />
            {busy ? "جارٍ الدخول..." : "دخول"}
          </button>
        </form>

        <Link to="/" className="mt-4 block text-center text-[11px] text-muted-foreground">
          العودة إلى المتجر
        </Link>
      </div>
    </div>
  );
}
