import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  User,
  Store,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { isValidYemeniPhone } from "@/lib/phone";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

type Search = {
  redirect?: string | undefined;
};

type AccountType = "customer" | "vendor";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    redirect:
      typeof search["redirect"] === "string" &&
      (search["redirect"] as string).startsWith("/")
        ? (search["redirect"] as string)
        : undefined,
  }),

  head: () => ({
    meta: [
      {
        title: "تسجيل الدخول | شهارة",
      },
      {
        name: "description",
        content:
          "سجّل الدخول أو أنشئ حساب عميل أو تاجر في شهارة.",
      },
    ],
  }),

  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();

  const {
    user,
    signIn,
    signUp,
    loading,
  } = useAuth();

  const [mode, setMode] =
    useState<"login" | "signup">("login");

  const [accountType, setAccountType] =
    useState<AccountType>("customer");

  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  const [storeName, setStoreName] = useState("");
  const [storeCity, setStoreCity] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeDescription, setStoreDescription] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;

    void navigate({
      to: redirect ?? "/account",
      replace: true,
    });
  }, [
    user,
    redirect,
    navigate,
  ]);

  function resetForm() {
    setPhone("");
    setFullName("");
    setPassword("");
    setStoreName("");
    setStoreCity("");
    setStorePhone("");
    setStoreDescription("");
  }

  function switchMode(
    next: "login" | "signup",
  ) {
    setMode(next);

    if (next === "login") {
      setAccountType("customer");
    }

    resetForm();
  }

  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!isValidYemeniPhone(phone)) {
      toast.error(
        "أدخل رقم هاتف يمني صحيح.",
      );
      return;
    }

    if (password.length < 6) {
      toast.error(
        "كلمة المرور يجب أن تكون ٦ أحرف على الأقل.",
      );
      return;
    }

    if (
      mode === "signup" &&
      fullName.trim().split(/\s+/).length < 3
    ) {
      toast.error(
        "أدخل الاسم الثلاثي كاملًا.",
      );
      return;
    }

    if (
      mode === "signup" &&
      accountType === "vendor"
    ) {
      if (!storeName.trim()) {
        toast.error(
          "اسم المتجر مطلوب.",
        );
        return;
      }

      if (!storeCity.trim()) {
        toast.error(
          "مدينة المتجر مطلوبة.",
        );
        return;
      }

      if (
        storeDescription.trim().length > 500
      ) {
        toast.error(
          "وصف المتجر طويل جدًا.",
        );
        return;
      }
    }

    setBusy(true);

    try {
      const result =
        mode === "login"
          ? await signIn({
              phone,
              password,
            })
          : await signUp({
              phone,
              fullName:
                fullName.trim(),
              password,
            });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      /*
       * التسجيل الأساسي ينشئ المستخدم كـ customer.
       *
       * عند اختيار تاجر لا نمنحه vendor role
       * مباشرةً لأسباب أمنية.
       *
       * يتم إنشاء متجر pending فقط.
       * الإدارة توافق عليه لاحقًا.
       */
      if (
        mode === "signup" &&
        accountType === "vendor"
      ) {
        const {
          data: authData,
        } = await supabase.auth.getUser();

        const currentUser =
          authData.user;

        if (!currentUser) {
          toast.error(
            "تم إنشاء الحساب، لكن تعذر إنشاء طلب المتجر. سجّل الدخول مرة أخرى.",
          );
          return;
        }

        const {
          error: vendorError,
        } = await supabase
          .from("vendors")
          .insert({
            user_id: currentUser.id,
            name: storeName.trim(),
            city: storeCity.trim(),
            phone:
              storePhone.trim() ||
              phone.trim(),
            description:
              storeDescription.trim(),
            is_active: false,
            account_enabled: false,
          });

        if (vendorError) {
          /*
           * الحساب نفسه تم إنشاؤه بنجاح.
           * لا نحذف الحساب بسبب فشل طلب المتجر.
           */
          console.error(
            "[Auth] Vendor application failed:",
            vendorError,
          );

          toast.error(
            "تم إنشاء الحساب، لكن تعذر إرسال طلب المتجر. يمكنك إرسال الطلب من حسابك لاحقًا.",
          );

          return;
        }

        toast.success(
          "تم إنشاء حساب التاجر وإرسال طلب فتح المتجر إلى الإدارة.",
        );
      } else {
        toast.success(
          mode === "login"
            ? "تم تسجيل الدخول بنجاح."
            : "تم إنشاء حسابك بنجاح.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-brand-gradient px-4 py-8"
    >
      <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-5 shadow-brand sm:p-7">
        <Link
          to="/"
          className="flex items-center justify-center gap-2"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
            ش
          </span>

          <span className="text-xl font-bold text-foreground">
            شهارة
          </span>
        </Link>

        <div className="mt-6 text-center">
          <h1 className="text-xl font-bold text-foreground">
            {mode === "login"
              ? "مرحبًا بعودتك"
              : "إنشاء حساب جديد"}
          </h1>

          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "login"
              ? "سجّل الدخول إلى حسابك في شهارة."
              : "أنشئ حسابك وابدأ التسوق أو البيع."}
          </p>
        </div>

        {mode === "signup" ? (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold text-foreground">
              نوع الحساب
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setAccountType("customer")
                }
                className={`rounded-2xl border p-4 text-center transition ${
                  accountType === "customer"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary"
                }`}
              >
                <User className="mx-auto h-6 w-6 text-primary" />

                <p className="mt-2 text-sm font-semibold text-foreground">
                  حساب عميل
                </p>

                <p className="mt-1 text-[10px] text-muted-foreground">
                  للتسوق والطلبات
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setAccountType("vendor")
                }
                className={`rounded-2xl border p-4 text-center transition ${
                  accountType === "vendor"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary"
                }`}
              >
                <Store className="mx-auto h-6 w-6 text-primary" />

                <p className="mt-2 text-sm font-semibold text-foreground">
                  حساب تاجر
                </p>

                <p className="mt-1 text-[10px] text-muted-foreground">
                  لإنشاء وإدارة متجرك
                </p>
              </button>
            </div>
          </div>
        ) : null}

        <form
          onSubmit={submit}
          className="mt-5 space-y-3"
        >
          {mode === "signup" ? (
            <Field
              label="الاسم الثلاثي"
              htmlFor="fullName"
            >
              <input
                id="fullName"
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value,
                  )
                }
                autoComplete="name"
                maxLength={100}
                className={inputCls}
                placeholder="الاسم الأول واسم الأب واسم العائلة"
              />
            </Field>
          ) : null}

          <Field
            label="رقم الهاتف"
            htmlFor="phone"
          >
            <input
              id="phone"
              value={phone}
              onChange={(event) =>
                setPhone(
                  event.target.value,
                )
              }
              inputMode="tel"
              dir="ltr"
              placeholder="7XXXXXXXX"
              autoComplete="tel"
              maxLength={20}
              className={inputCls}
            />
          </Field>

          <Field
            label="كلمة المرور"
            htmlFor="password"
          >
            <div className="relative">
              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                maxLength={72}
                className={`${inputCls} pl-11`}
              />

              <button
                type="button"
                aria-label={
                  showPassword
                    ? "إخفاء كلمة المرور"
                    : "إظهار كلمة المرور"
                }
                onClick={() =>
                  setShowPassword(
                    (value) => !value,
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>

          {mode === "signup" &&
          accountType === "vendor" ? (
            <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />

                <h2 className="text-sm font-semibold text-foreground">
                  بيانات المتجر
                </h2>
              </div>

              <Field
                label="اسم المتجر"
                htmlFor="storeName"
              >
                <input
                  id="storeName"
                  value={storeName}
                  onChange={(event) =>
                    setStoreName(
                      event.target.value,
                    )
                  }
                  maxLength={120}
                  className={inputCls}
                  placeholder="مثال: متجر الأناقة"
                />
              </Field>

              <Field
                label="مدينة المتجر"
                htmlFor="storeCity"
              >
                <input
                  id="storeCity"
                  value={storeCity}
                  onChange={(event) =>
                    setStoreCity(
                      event.target.value,
                    )
                  }
                  maxLength={80}
                  className={inputCls}
                  placeholder="صنعاء"
                />
              </Field>

              <Field
                label="هاتف المتجر"
                htmlFor="storePhone"
              >
                <input
                  id="storePhone"
                  value={storePhone}
                  onChange={(event) =>
                    setStorePhone(
                      event.target.value,
                    )
                  }
                  dir="ltr"
                  inputMode="tel"
                  maxLength={20}
                  className={inputCls}
                  placeholder="اختياري"
                />
              </Field>

              <Field
                label="نبذة عن المتجر"
                htmlFor="storeDescription"
              >
                <textarea
                  id="storeDescription"
                  value={
                    storeDescription
                  }
                  onChange={(event) =>
                    setStoreDescription(
                      event.target.value,
                    )
                  }
                  maxLength={500}
                  className={`${inputCls} h-24 py-2`}
                  placeholder="اكتب نبذة مختصرة عن نشاط المتجر ومنتجاته."
                />
              </Field>

              <div className="flex items-start gap-2 rounded-xl bg-background/70 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                <p className="text-[11px] leading-5 text-muted-foreground">
                  سيتم مراجعة طلب المتجر من
                  الإدارة قبل تفعيل صلاحيات البيع.
                </p>
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy || loading}
            className="h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {busy
              ? "جارٍ المعالجة..."
              : mode === "login"
                ? "تسجيل الدخول"
                : accountType === "vendor"
                  ? "إنشاء حساب التاجر"
                  : "إنشاء حساب العميل"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-2">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[11px] text-muted-foreground">
            أو
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={async () => {
            const result =
              await lovable.auth.signInWithOAuth(
                "google",
                {
                  redirect_uri:
                    window.location.origin,
                },
              );

            if (result.error) {
              toast.error(
                "تعذّر الدخول بجوجل، حاول مرة أخرى.",
              );
            }
          }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm text-foreground"
        >
          الدخول بحساب جوجل
        </button>

        <button
          type="button"
          onClick={() =>
            switchMode(
              mode === "login"
                ? "signup"
                : "login",
            )
          }
          className="mt-4 w-full text-xs font-medium text-primary"
        >
          {mode === "login"
            ? "ليس لديك حساب؟ إنشاء حساب جديد"
            : "لديك حساب بالفعل؟ تسجيل الدخول"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-foreground"
      >
        {label}
      </label>

      <div className="mt-1">
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-2xl border border-border bg-secondary px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
