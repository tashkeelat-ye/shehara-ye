import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { isValidYemeniPhone } from "@/lib/phone";
import { lovable } from "@/integrations/lovable/index";

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
      { title: "تسجيل الدخول | شهارة" },
      {
        name: "description",
        content: "سجّل الدخول أو أنشئ حسابًا في شهارة برقم الهاتف اليمني والاسم الثلاثي.",
      },
      { property: "og:title", content: "تسجيل الدخول | شهارة" },
      { property: "og:description", content: "الدخول إلى حسابك في متجر شهارة." },
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
          <span className="text-lg text-foreground">شهارة</span>
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

        <div className="my-4 flex items-center gap-2">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[11px] text-muted-foreground">أو</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={async () => {
            const result = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin,
            });
            if (result.error) {
              toast.error("تعذّر الدخول بجوجل، حاول مرة أخرى.");
              return;
            }
          }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm text-foreground"
        >
          <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.5c-.3 2.1-1.6 5.2-4.6 7.3l7.6 5.9c4.4-4.1 6.6-10.1 6.6-17.5z" />
            <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.4 0 20.1 0 24s1 7.6 2.6 10.8l7.8-6.1z" />
            <path fill="#34A853" d="M24 48c6.2 0 11.5-2 15.5-5.6l-7.6-5.9c-2 1.4-4.7 2.4-7.9 2.4-6.4 0-11.7-3.7-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          الدخول بحساب جوجل
        </button>

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
