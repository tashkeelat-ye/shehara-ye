import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";

import {
  useEffect,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";

import {
  User,
  Store,
  Bike,
  Eye,
  EyeOff,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  LockKeyhole,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";

import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { isValidYemeniPhone } from "@/lib/phone";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { YEMEN_GOVERNORATES } from "@/lib/yemen";
import { BrandLogo } from "@/components/brand-logo";

type Search = {
  redirect?: string;
};

type AccountType =
  | "customer"
  | "vendor"
  | "courier";

export const Route = createFileRoute(
  "/auth",
)({
  validateSearch: (
    search: Record<string, unknown>,
  ): Search => ({
    redirect:
      typeof search.redirect === "string" &&
      search.redirect.startsWith("/")
        ? search.redirect
        : undefined,
  }),

  head: () => ({
    meta: [
      {
        title:
          "تسجيل الدخول وإنشاء الحساب | شهارة",
      },
      {
        name: "description",
        content:
          "أنشئ حساب عميل أو تاجر في منصة شهارة، أو سجل الدخول كعامل توصيل.",
      },
    ],
  }),

  component: AuthPage,
});

function AuthPage() {
  const { redirect } =
    Route.useSearch();

  const navigate = useNavigate();

  const {
    user,
    role,
    signIn,
    signUp,
    refreshAuthState,
    loading,
  } = useAuth();

  const [mode, setMode] =
    useState<
      "login" | "signup"
    >("login");

  const [accountType, setAccountType] =
    useState<AccountType>(
      "customer",
    );

  const [firstName, setFirstName] =
    useState("");

  const [secondName, setSecondName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [province, setProvince] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    acceptedTerms,
    setAcceptedTerms,
  ] = useState(false);

  const [storeName, setStoreName] =
    useState("");

  const [storeCity, setStoreCity] =
    useState("");

  const [
    storeDescription,
    setStoreDescription,
  ] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [busy, setBusy] =
    useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const destination =
      redirect ??
      (role === "courier"
        ? "/courier"
        : role === "vendor"
          ? "/merchant"
          : role === "admin"
            ? "/admin"
            : "/account");

    void navigate({
      to: destination,
      replace: true,
    });
  }, [
    user,
    role,
    redirect,
    navigate,
  ]);

  function resetForm() {
    setFirstName("");
    setSecondName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setProvince("");
    setPassword("");
    setConfirmPassword("");
    setAcceptedTerms(false);
    setStoreName("");
    setStoreCity("");
    setStoreDescription("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  function switchMode(
    next:
      | "login"
      | "signup",
  ) {
    setMode(next);

    /*
     * عامل التوصيل متاح لتسجيل الدخول فقط.
     * عند الانتقال إلى التسجيل نعود تلقائياً
     * إلى حساب العميل حتى لا يتم إنشاء حساب
     * Courier من الواجهة العامة.
     */
    if (next === "signup") {
      setAccountType("customer");
    }

    resetForm();
  }

  function normalizePhoneInput(
    value: string,
  ) {
    return value.replace(
      /[^\d]/g,
      "",
    );
  }

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      mode === "signup"
    ) {
      if (
        firstName.trim().length < 2
      ) {
        toast.error(
          "أدخل الاسم الأول.",
        );
        return;
      }

      if (
        secondName.trim().length < 2
      ) {
        toast.error(
          "أدخل الاسم الثاني.",
        );
        return;
      }

      if (
        lastName.trim().length < 2
      ) {
        toast.error(
          "أدخل اللقب.",
        );
        return;
      }
    }

    if (
      mode === "signup" &&
      accountType === "courier"
    ) {
      toast.error(
        "إنشاء حساب عامل التوصيل متاح من لوحة الإدارة فقط.",
      );

      setAccountType(
        "customer",
      );

      return;
    }

    if (
      !isValidYemeniPhone(
        phone,
      )
    ) {
      toast.error(
        "رقم الهاتف يجب أن يتكون من 9 أرقام ويبدأ بـ 77 أو 78 أو 71 أو 73 أو 70.",
      );

      return;
    }

    if (
      mode === "signup" &&
      !province
    ) {
      toast.error(
        "اختر المحافظة.",
      );

      return;
    }

    if (
      mode === "signup" &&
      password.length < 6
    ) {
      toast.error(
        "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
      );

      return;
    }

    if (
      mode === "signup" &&
      password !== confirmPassword
    ) {
      toast.error(
        "كلمتا المرور غير متطابقتين.",
      );

      return;
    }

    if (
      mode === "signup" &&
      !acceptedTerms
    ) {
      toast.error(
        "يجب الموافقة على الشروط والأحكام.",
      );

      return;
    }

    if (
      mode === "signup" &&
      accountType === "vendor"
    ) {
      if (
        !storeName.trim()
      ) {
        toast.error(
          "اسم المتجر مطلوب.",
        );

        return;
      }

      if (
        !storeCity.trim()
      ) {
        toast.error(
          "مدينة المتجر مطلوبة.",
        );

        return;
      }

      if (
        storeDescription.length >
        500
      ) {
        toast.error(
          "وصف المتجر يجب ألا يتجاوز 500 حرف.",
        );

        return;
      }
    }

    setBusy(true);

    try {
      const cleanPhone =
        normalizePhoneInput(
          phone,
        );

      const result =
        mode === "login"
          ? await signIn({
              phone:
                cleanPhone,
              password,
            })
          : await signUp({
              phone:
                cleanPhone,
              fullName:
                `${firstName.trim()} ${secondName.trim()} ${lastName.trim()}`,
              password,
            });

      if (result.error) {
        toast.error(
          result.error,
        );

        return;
      }

      if (
        mode === "signup"
      ) {
        if (
          accountType ===
          "vendor"
        ) {
          const {
            error,
          } =
            await (
              supabase as any
            ).rpc(
              "register_vendor_account",
              {
                p_store_name:
                  storeName.trim(),

                p_city:
                  storeCity.trim(),

                p_phone:
                  cleanPhone,

                p_description:
                  storeDescription.trim(),

                p_first_name:
                  firstName.trim(),

                p_second_name:
                  secondName.trim(),

                p_last_name:
                  lastName.trim(),

                p_province:
                  province,

                p_contact_email:
                  email.trim() ||
                  null,

                p_accepted_terms:
                  true,
              },
            );

          if (error) {
            console.error(
              "[Auth] Vendor registration failed:",
              error,
            );

            toast.error(
              error.message ||
                "تعذر إنشاء حساب التاجر.",
            );

            return;
          }

          await refreshAuthState();

          toast.success(
            "تم إنشاء حساب التاجر وتفعيل متجرك بنجاح.",
          );

          return;
        }

        const {
          error,
        } =
          await (
            supabase as any
          )
            .from(
              "profiles",
            )
            .update({
              first_name:
                firstName.trim(),

              second_name:
                secondName.trim(),

              last_name:
                lastName.trim(),

              full_name:
                `${firstName.trim()} ${secondName.trim()} ${lastName.trim()}`,

              phone:
                cleanPhone,

              province,

              contact_email:
                email.trim() ||
                null,

              accepted_terms:
                true,
            })
            .eq(
              "id",
              user?.id,
            );

        if (error) {
          console.error(
            "[Auth] Profile completion failed:",
            error,
          );

          toast.error(
            "تم إنشاء الحساب، لكن تعذر حفظ بعض بيانات الملف الشخصي.",
          );

          return;
        }

        await refreshAuthState();

        toast.success(
          "تم إنشاء حساب العميل بنجاح.",
        );

        return;
      }

      await refreshAuthState();

      toast.success(
        role === "courier"
          ? "تم تسجيل دخول عامل التوصيل بنجاح."
          : "تم تسجيل الدخول بنجاح.",
      );
    } catch (error) {
      console.error(
        "[Auth] submit failed:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع.",
      );
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "login";
  const isVendorSignup =
    mode === "signup" &&
    accountType === "vendor";

  return (
    <main
      dir="rtl"
      className="relative min-h-[100dvh] overflow-hidden bg-[#071f29] text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#D65A31]/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-[#0E4D64]/60 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.10),transparent_38%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-[0_30px_100px_rgba(0,0,0,.35)] backdrop-blur-xl lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="relative hidden min-h-[760px] overflow-hidden bg-[#0A3D50] p-10 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 top-20 h-64 w-64 rounded-full bg-[#D65A31]/15 blur-3xl" />
            <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#0E4D64] blur-3xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
                <Sparkles className="h-4 w-4 text-[#D65A31]" />
                <span className="text-xs font-semibold text-white/80">
                  تجربة شهارة الجديدة
                </span>
              </div>

              <div className="mt-12 flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-7 rounded-[2.5rem] border border-white/10" />
                  <div className="absolute -inset-12 rounded-[3rem] border border-[#D65A31]/10" />
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-[2.25rem] border border-white/15 bg-white/[0.08] shadow-2xl backdrop-blur-xl">
                    <BrandLogo
                      size={104}
                      priority
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10 text-center">
                <p className="text-sm font-medium text-white/55">
                  شهارة | SHEHARA
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-tight">
                  تسوق بلا حدود
                </h2>

                <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-white/65">
                  ادخل إلى عالم شهارة واستمتع بتجربة
                  تسوق يمنية حديثة، بسيطة، وآمنة.
                </p>
              </div>
            </div>

            <div className="relative space-y-3">
              <LuxuryFeature
                icon={<ShoppingBag className="h-4 w-4" />}
                title="كل احتياجاتك في مكان واحد"
                text="منتجات، عروض وخدمات مصممة لتكون أقرب إليك."
              />

              <LuxuryFeature
                icon={<ShieldCheck className="h-4 w-4" />}
                title="حسابك تحت الحماية"
                text="تسجيل دخول آمن وتجربة موثوقة داخل المنصة."
              />

              <p className="pt-3 text-center text-[10px] text-white/35">
                © شهارة للتسوق — تسوق بلا حدود
              </p>
            </div>
          </aside>

          <section className="min-w-0 bg-[#f8fafb] text-foreground">
            <div className="mx-auto w-full max-w-xl p-5 sm:p-8 lg:p-10">
              <div className="mb-7 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 lg:hidden">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#0E4D64]/10 bg-white shadow-sm">
                    <BrandLogo
                      size={38}
                      priority
                    />
                  </div>

                  <div>
                    <p className="text-sm font-black text-[#0A3D50]">
                      شهارة
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      تسوق بلا حدود
                    </p>
                  </div>
                </div>

                <div className="mr-auto hidden rounded-full border border-[#0E4D64]/10 bg-white px-3 py-1.5 text-[10px] font-semibold text-[#0A3D50] shadow-sm sm:flex">
                  منصة تسوق يمنية
                </div>
              </div>

              <div className="mb-7">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#0E4D64]/[0.07] px-3 py-1.5 text-[10px] font-bold text-[#0A3D50]">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  دخول آمن إلى حسابك
                </div>

                <h1 className="text-2xl font-black tracking-tight text-[#071f29] sm:text-3xl">
                  {isLogin
                    ? "مرحبًا بعودتك"
                    : "أنشئ حسابك في شهارة"}
                </h1>

                <p className="mt-2 max-w-md text-xs leading-6 text-muted-foreground">
                  {isLogin
                    ? "سجّل الدخول واستكمل رحلتك في شهارة."
                    : "أنشئ حسابك كعميل أو تاجر وابدأ رحلتك معنا."}
                </p>
              </div>

              <div className="mb-6 grid grid-cols-2 rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-sm">
                <ModeButton
                  active={isLogin}
                  onClick={() =>
                    switchMode("login")
                  }
                >
                  تسجيل الدخول
                </ModeButton>

                <ModeButton
                  active={!isLogin}
                  onClick={() =>
                    switchMode("signup")
                  }
                >
                  إنشاء حساب
                </ModeButton>
              </div>

              {isLogin ? (
                <div className="mb-6">
                  <p className="mb-2.5 text-[11px] font-bold text-[#071f29]">
                    الدخول إلى
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <AccountTypeButton
                      active={
                        accountType ===
                        "customer"
                      }
                      icon={
                        <User className="h-5 w-5" />
                      }
                      title="حساب عميل"
                      description="التسوق والطلبات"
                      onClick={() =>
                        setAccountType(
                          "customer",
                        )
                      }
                    />

                    <AccountTypeButton
                      active={
                        accountType ===
                        "courier"
                      }
                      icon={
                        <Bike className="h-5 w-5" />
                      }
                      title="عامل توصيل"
                      description="إدارة وتسليم الطلبات"
                      onClick={() =>
                        setAccountType(
                          "courier",
                        )
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <p className="mb-2.5 text-[11px] font-bold text-[#071f29]">
                    نوع الحساب
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <AccountTypeButton
                      active={
                        accountType ===
                        "customer"
                      }
                      icon={
                        <User className="h-5 w-5" />
                      }
                      title="حساب عميل"
                      description="للتسوق والطلبات"
                      onClick={() =>
                        setAccountType(
                          "customer",
                        )
                      }
                    />

                    <AccountTypeButton
                      active={
                        accountType ===
                        "vendor"
                      }
                      icon={
                        <Store className="h-5 w-5" />
                      }
                      title="حساب تاجر"
                      description="لإدارة متجرك"
                      onClick={() =>
                        setAccountType(
                          "vendor",
                        )
                      }
                    />
                  </div>
                </div>
              )}

              <form
                onSubmit={submit}
                className="space-y-4"
              >
                {mode === "signup" ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="الاسم الأول *"
                        htmlFor="firstName"
                      >
                        <input
                          id="firstName"
                          value={
                            firstName
                          }
                          onChange={(
                            event,
                          ) =>
                            setFirstName(
                              event.target
                                .value,
                            )
                          }
                          maxLength={50}
                          className={
                            inputCls
                          }
                          placeholder="مثال: أمير"
                          autoComplete="given-name"
                        />
                      </Field>

                      <Field
                        label="الاسم الثاني *"
                        htmlFor="secondName"
                      >
                        <input
                          id="secondName"
                          value={
                            secondName
                          }
                          onChange={(
                            event,
                          ) =>
                            setSecondName(
                              event.target
                                .value,
                            )
                          }
                          maxLength={50}
                          className={
                            inputCls
                          }
                          placeholder="مثال: غمدان"
                        />
                      </Field>
                    </div>

                    <Field
                      label="اللقب *"
                      htmlFor="lastName"
                    >
                      <input
                        id="lastName"
                        value={
                          lastName
                        }
                        onChange={(
                          event,
                        ) =>
                          setLastName(
                            event.target
                              .value,
                          )
                        }
                        maxLength={60}
                        className={
                          inputCls
                        }
                        placeholder="مثال: الصبري"
                        autoComplete="family-name"
                      />
                    </Field>
                  </>
                ) : null}

                <Field
                  label={
                    mode === "signup"
                      ? "رقم الهاتف *"
                      : accountType ===
                          "courier"
                        ? "رقم هاتف عامل التوصيل"
                        : "رقم الهاتف"
                  }
                  htmlFor="phone"
                >
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0E4D64]/65" />

                    <input
                      id="phone"
                      value={phone}
                      onChange={(
                        event,
                      ) =>
                        setPhone(
                          normalizePhoneInput(
                            event.target
                              .value,
                          ),
                        )
                      }
                      inputMode="numeric"
                      dir="ltr"
                      maxLength={9}
                      placeholder="7XXXXXXXX"
                      autoComplete="tel"
                      className={`${inputCls} pr-10`}
                    />
                  </div>

                  <p className="mt-1.5 text-[9px] leading-4 text-muted-foreground">
                    9 أرقام ويبدأ بـ 77 أو 78 أو 71 أو 73 أو 70.
                  </p>
                </Field>

                {mode === "signup" ? (
                  <>
                    <Field
                      label="البريد الإلكتروني — اختياري"
                      htmlFor="email"
                    >
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0E4D64]/65" />

                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(
                            event,
                          ) =>
                            setEmail(
                              event.target
                                .value,
                            )
                          }
                          dir="ltr"
                          maxLength={160}
                          className={`${inputCls} pr-10`}
                          placeholder="example@email.com"
                          autoComplete="email"
                        />
                      </div>
                    </Field>

                    <Field
                      label="المحافظة *"
                      htmlFor="province"
                    >
                      <div className="relative">
                        <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0E4D64]/65" />

                        <select
                          id="province"
                          value={
                            province
                          }
                          onChange={(
                            event,
                          ) =>
                            setProvince(
                              event.target
                                .value,
                            )
                          }
                          className={`${inputCls} pr-10`}
                        >
                          <option value="">
                            اختر المحافظة
                          </option>

                          {YEMEN_GOVERNORATES.map(
                            (
                              item,
                            ) => (
                              <option
                                key={
                                  item
                                }
                                value={
                                  item
                                }
                              >
                                {
                                  item
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </Field>
                  </>
                ) : null}

                <Field
                  label="كلمة المرور *"
                  htmlFor="password"
                >
                  <PasswordInput
                    id="password"
                    value={
                      password
                    }
                    show={
                      showPassword
                    }
                    onChange={
                      setPassword
                    }
                    onToggle={() =>
                      setShowPassword(
                        (
                          value,
                        ) =>
                          !value,
                      )
                    }
                    isLogin={
                      mode ===
                      "login"
                    }
                  />
                </Field>

                {mode === "signup" ? (
                  <Field
                    label="أعد إدخال كلمة المرور *"
                    htmlFor="confirmPassword"
                  >
                    <PasswordInput
                      id="confirmPassword"
                      value={
                        confirmPassword
                      }
                      show={
                        showConfirmPassword
                      }
                      onChange={
                        setConfirmPassword
                      }
                      onToggle={() =>
                        setShowConfirmPassword(
                          (
                            value,
                          ) =>
                            !value,
                        )
                      }
                      isLogin={false}
                    />
                  </Field>
                ) : null}

                {isVendorSignup ? (
                  <div className="space-y-4 rounded-[1.5rem] border border-[#0E4D64]/10 bg-[#0E4D64]/[0.04] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
                        <Store className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="text-sm font-black text-[#071f29]">
                          بيانات المتجر
                        </h2>

                        <p className="text-[10px] text-muted-foreground">
                          ستظهر بيانات متجرك للعملاء داخل شهارة.
                        </p>
                      </div>
                    </div>

                    <Field
                      label="اسم المتجر *"
                      htmlFor="storeName"
                    >
                      <input
                        id="storeName"
                        value={
                          storeName
                        }
                        onChange={(
                          event,
                        ) =>
                          setStoreName(
                            event.target
                              .value,
                          )
                        }
                        maxLength={120}
                        className={
                          inputCls
                        }
                        placeholder="مثال: متجر الأناقة"
                      />
                    </Field>

                    <Field
                      label="مدينة المتجر *"
                      htmlFor="storeCity"
                    >
                      <input
                        id="storeCity"
                        value={
                          storeCity
                        }
                        onChange={(
                          event,
                        ) =>
                          setStoreCity(
                            event.target
                              .value,
                          )
                        }
                        maxLength={80}
                        className={
                          inputCls
                        }
                        placeholder="صنعاء"
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
                        onChange={(
                          event,
                        ) =>
                          setStoreDescription(
                            event.target
                              .value,
                          )
                        }
                        maxLength={500}
                        className={`${inputCls} h-24 py-2`}
                        placeholder="نبذة مختصرة عن نشاط المتجر..."
                      />
                    </Field>

                    <div className="flex items-start gap-2 rounded-xl bg-white/70 p-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0E4D64]" />

                      <p className="text-[10px] leading-5 text-muted-foreground">
                        بعد إنشاء الحساب سيتم تفعيل لوحة التاجر وتمكينك من إدارة المنتجات والمتجر.
                      </p>
                    </div>
                  </div>
                ) : null}

                {mode === "signup" ? (
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-sm">
                    <input
                      type="checkbox"
                      checked={
                        acceptedTerms
                      }
                      onChange={(
                        event,
                      ) =>
                        setAcceptedTerms(
                          event.target
                            .checked,
                        )
                      }
                      className="mt-0.5 h-4 w-4 accent-[#0E4D64]"
                    />

                    <span className="text-xs leading-5 text-foreground">
                      أوافق على{" "}
                      <Link
                        to="/page/$slug"
                        params={{
                          slug: "terms",
                        }}
                        className="font-bold text-[#0E4D64] underline"
                        onClick={(
                          event,
                        ) =>
                          event.stopPropagation()
                        }
                      >
                        الشروط والأحكام
                      </Link>{" "}
                      وسياسة استخدام منصة شهارة.
                    </span>
                  </label>
                ) : null}

                <button
                  type="submit"
                  disabled={
                    busy ||
                    loading
                  }
                  className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#0E4D64] text-sm font-black text-white shadow-[0_14px_30px_rgba(14,77,100,.20)] transition hover:bg-[#0A3D50] hover:shadow-[0_18px_36px_rgba(14,77,100,.26)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-y-0 right-0 w-24 translate-x-full bg-white/10 blur-xl transition-transform duration-700 group-hover:translate-x-[-500%]" />

                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      جارٍ المعالجة...
                    </>
                  ) : (
                    <>
                      {isLogin
                        ? accountType ===
                          "courier"
                          ? "دخول عامل التوصيل"
                          : "تسجيل الدخول"
                        : accountType ===
                            "vendor"
                          ? "إنشاء حساب التاجر"
                          : "إنشاء حساب العميل"}

                      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              {mode === "login" &&
              accountType !==
                "courier" ? (
                <>
                  <div className="my-5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-black/[0.07]" />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      أو
                    </span>
                    <span className="h-px flex-1 bg-black/[0.07]" />
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const result =
                        await lovable.auth.signInWithOAuth(
                          "google",
                          {
                            redirect_uri:
                              window.location
                                .origin,
                          },
                        );

                      if (
                        result.error
                      ) {
                        toast.error(
                          "تعذر الدخول بحساب جوجل.",
                        );
                      }
                    }}
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-black/[0.07] bg-white text-sm font-bold text-foreground shadow-sm transition hover:border-[#0E4D64]/20 hover:bg-[#0E4D64]/[0.03]"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-black/[0.06] bg-white text-sm font-black">
                      G
                    </span>
                    الدخول بحساب جوجل
                  </button>
                </>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  switchMode(
                    mode ===
                      "login"
                      ? "signup"
                      : "login",
                  )
                }
                className="group mt-5 flex w-full items-center justify-center gap-1.5 text-xs font-bold text-[#0E4D64]"
              >
                {mode === "login"
                  ? "ليس لديك حساب؟ إنشاء حساب جديد"
                  : "لديك حساب بالفعل؟ تسجيل الدخول"}

                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              </button>

              {mode === "login" &&
              accountType ===
                "courier" ? (
                <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-[#0E4D64]/10 bg-[#0E4D64]/[0.04] p-3.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0E4D64]" />

                  <p className="text-[10px] leading-5 text-muted-foreground">
                    حسابات عمال التوصيل يتم إنشاؤها
                    وإدارتها من لوحة الإدارة فقط.
                    إذا كان لديك حساب، استخدم رقم
                    الهاتف وكلمة المرور المخصصة لك.
                  </p>
                </div>
              ) : null}

              <div className="mt-7 flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground">
                <LockKeyhole className="h-3 w-3" />
                بياناتك محمية ويتم التعامل معها بأمان.
              </div>
            </div>
          </section>
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </main>
  );
}

function LuxuryFeature({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5 backdrop-blur">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D65A31]/10 text-[#D65A31]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold text-white/90">
          {title}
        </p>

        <p className="mt-1 text-[10px] leading-5 text-white/45">
          {text}
        </p>
      </div>

      <CheckCircle2 className="mr-auto mt-1 h-4 w-4 shrink-0 text-white/25" />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-xl text-xs font-black transition ${
        active
          ? "bg-[#0E4D64] text-white shadow-sm"
          : "text-muted-foreground hover:bg-black/[0.03] hover:text-[#0E4D64]"
      }`}
    >
      {children}
    </button>
  );
}

function AccountTypeButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border p-3.5 text-right transition duration-200 ${
        active
          ? "border-[#0E4D64]/25 bg-[#0E4D64]/[0.07] shadow-sm"
          : "border-black/[0.06] bg-white hover:border-[#0E4D64]/15 hover:bg-[#0E4D64]/[0.025]"
      }`}
    >
      {active ? (
        <span className="absolute right-0 top-0 h-1 w-12 rounded-bl-full bg-[#D65A31]" />
      ) : null}

      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl transition ${
          active
            ? "bg-[#0E4D64] text-white"
            : "bg-[#0E4D64]/[0.07] text-[#0E4D64]"
        }`}
      >
        {icon}
      </div>

      <p className="text-xs font-black text-[#071f29]">
        {title}
      </p>

      <p className="mt-1 text-[9px] leading-4 text-muted-foreground">
        {description}
      </p>
    </button>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-bold text-[#071f29]"
      >
        {label}
      </label>

      <div className="mt-1.5">
        {children}
      </div>
    </div>
  );
}

function PasswordInput({
  id,
  value,
  show,
  onChange,
  onToggle,
  isLogin,
}: {
  id: string;
  value: string;
  show: boolean;
  onChange: (
    value: string,
  ) => void;
  onToggle: () => void;
  isLogin: boolean;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={
          show
            ? "text"
            : "password"
        }
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        maxLength={72}
        autoComplete={
          isLogin
            ? "current-password"
            : "new-password"
        }
        className={`${inputCls} pl-12`}
      />

      <button
        type="button"
        onClick={onToggle}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-muted-foreground transition hover:bg-[#0E4D64]/[0.06] hover:text-[#0E4D64]"
        aria-label={
          show
            ? "إخفاء كلمة المرور"
            : "إظهار كلمة المرور"
        }
      >
        {show ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-2xl border border-black/[0.07] bg-white px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#0E4D64]/35 focus:ring-4 focus:ring-[#0E4D64]/[0.07]";
