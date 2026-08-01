import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { isValidYemeniPhone } from "@/lib/phone";

type Search = { redirect?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    redirect:
      typeof search["redirect"] === "string" && (search["redirect"] as string).startsWith("/")
        ? (search["redirect"] as string)
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | تشكيلات" },
      {
        name: "description",
        content: "سجّل الدخول أو أنشئ حسابًا في تشكيلات برقم الهاتف اليمني والاسم الثلاثي.",
      },
      { property: "og:title", content: "تسجيل الدخول | تشكيلات" },
      { property: "og:description", content: "الدخول إلى حسابك في متجر تشكيلات." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: redirect ?? "/account", replace: true });
  }, [user, redirect, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidYemeniPhone(phone)) {
      toast.error("أدخل رقم هاتف يمني صحيح (مثال: 7٧٧١٢٣٤٥٦)");
      return;
    }
    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون ٦ أحرف على الأقل");
      return;
    }
    if (mode === "signup" && fullName.trim().split(/\s+/).length < 3) {
      toast.error("أدخل الاسم الثلاثي كاملًا");
      return;
    }
    setBusy(true);
    const res =
      mode === "login"
        ? await signIn({ phone, password })
        : await signUp({ phone, fullName: fullName.trim(), password });
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(mode === "login" ? "تم تسجيل الدخول" : "تم إنشاء حسابك بنجاح");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-gradient px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-brand">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg text-primary-foreground">
            ت
          </span>
          <span className="text-lg text-foreground">تشكيلات</span>
        </Link>

        <h1 className="mt-5 text-xl text-foreground">
          {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          نستخدم رقم هاتفك للدخول — بدون رمز تحقق حاليًا.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "signup" ? (
            <div>
              <label htmlFor="fullName" className="text-xs text-foreground">
                الاسم الثلاثي
              </label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                maxLength={100}
                className="mt-1 h-11 w-full rounded-2xl border border-border bg-secondary px-3 text-sm outline-none focus:border-primary"
              />
            </div>
          ) : null}
          <div>
            <label htmlFor="phone" className="text-xs text-foreground">
              رقم الهاتف
            </label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              dir="ltr"
              placeholder="7XXXXXXXX"
              autoComplete="tel"
              maxLength={20}
              className="mt-1 h-11 w-full rounded-2xl border border-border bg-secondary px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs text-foreground">
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              maxLength={72}
              className="mt-1 h-11 w-full rounded-2xl border border-border bg-secondary px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={busy || loading}
            className="h-12 w-full rounded-2xl bg-primary text-sm text-primary-foreground disabled:opacity-60"
          >
            {busy ? "جارٍ المعالجة..." : mode === "login" ? "دخول" : "إنشاء الحساب"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-xs text-primary"
        >
          {mode === "login" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب؟ سجّل الدخول"}
        </button>
      </div>
    </div>
  );
}
