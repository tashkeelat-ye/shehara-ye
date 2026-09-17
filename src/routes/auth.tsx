import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";

import {
  useEffect,
  useState,
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
} from "lucide-react";

import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { isValidYemeniPhone } from "@/lib/phone";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { YEMEN_GOVERNORATES } from "@/lib/yemen";

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
    event: React.FormEvent,
  ) {
    event.preventDefault();

    /*
     * =====================================================
     * التحقق من بيانات التسجيل
     * =====================================================
     */
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

    /*
     * عامل التوصيل لا يستطيع التسجيل من الواجهة
     * العامة بأي شكل.
     */
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

    /*
     * =====================================================
     * التحقق من الهاتف
     * =====================================================
     */
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

    /*
     * =====================================================
     * بيانات التسجيل
     * =====================================================
     */
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

    /*
     * =====================================================
     * بيانات التاجر
     * =====================================================
     */
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

    /*
     * =====================================================
     * بدء العملية
     * =====================================================
     */
    setBusy(true);

    try {
      const cleanPhone =
        normalizePhoneInput(
          phone,
        );

      /*
       * ===================================================
       * تسجيل الدخول
       * ===================================================
       *
       * العميل والتاجر وعامل التوصيل يستخدمون
       * نفس نظام Auth.
       *
       * تحديد الوجهة يتم بعد قراءة role من auth-context.
       */
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

      /*
       * =====================================================
       * التسجيل
       * =====================================================
       */
      if (
        mode === "signup"
      ) {
        /*
         * ===================================================
         * تسجيل التاجر
         * ===================================================
         */
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

        /*
         * ===================================================
         * تسجيل العميل
         * ===================================================
         */
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

      /*
       * =====================================================
       * تسجيل الدخول
       * =====================================================
       */
      await refreshAuthState();

      /*
       * لا نقوم بالتوجيه يدوياً هنا.
       *
       * useEffect في أعلى الصفحة يقرأ:
       *
       * admin   -> /admin
       * vendor  -> /merchant
       * courier -> /courier
       * customer -> /account
       *
       * وهذا يمنع وجود مسارات مختلفة ومتعارضة.
       */
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

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-brand-gradient px-4 py-8"
    >
      <div className="mx-auto w-full max-w-lg">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-brand">
          {/* =================================================
              شعار شهارة
              ================================================= */}

          <div className="flex flex-col items-center border-b border-border bg-white px-5 py-6">
            <img
              src="/shehara-logo.png"
              alt="شهارة"
              className="h-24 w-auto object-contain"
            />

            <p className="mt-2 text-xs text-muted-foreground">
              كل احتياجاتك في مكان واحد
            </p>
          </div>

          <div className="p-5 sm:p-7">
            {/* =================================================
                العنوان
                ================================================= */}

            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">
                {mode === "login"
                  ? "مرحبًا بعودتك"
                  : "إنشاء حساب جديد"}
              </h1>

              <p className="mt-2 text-xs text-muted-foreground">
                {mode === "login"
                  ? "سجل الدخول إلى حسابك في شهارة."
                  : "أنشئ حسابك كعميل أو تاجر وابدأ الآن."}
              </p>
            </div>

            {/* =================================================
                نوع الحساب
                ================================================= */}

            {mode === "signup" ? (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold text-foreground">
                  نوع الحساب
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <AccountTypeButton
                    active={
                      accountType ===
                      "customer"
                    }
                    icon={
                      <User className="mx-auto h-6 w-6" />
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
                      <Store className="mx-auto h-6 w-6" />
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
            ) : (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold text-foreground">
                  تسجيل الدخول إلى
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <AccountTypeButton
                    active={
                      accountType ===
                      "customer"
                    }
                    icon={
                      <User className="mx-auto h-6 w-6" />
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
                      <Bike className="mx-auto h-6 w-6" />
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
            )}

            {/* =================================================
                النموذج
                ================================================= */}

            <form
              onSubmit={submit}
              className="mt-6 space-y-4"
            >
              {/* =================================================
                  بيانات الاسم - التسجيل فقط
                  ================================================= */}

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

              {/* =================================================
                  رقم الهاتف
                  ================================================= */}

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
                  <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

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

                <p className="mt-1 text-[10px] text-muted-foreground">
                  يجب أن يبدأ بـ 77 أو 78 أو 71 أو 73 أو 70 ويتكون من 9 أرقام.
                </p>
              </Field>

              {/* =================================================
                  بيانات التسجيل الإضافية
                  ================================================= */}

              {mode === "signup" ? (
                <>
                  <Field
                    label="البريد الإلكتروني — اختياري"
                    htmlFor="email"
                  >
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

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
                      <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

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

              {/* =================================================
                  كلمة المرور
                  ================================================= */}

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

              {/* =================================================
                  تأكيد كلمة المرور
                  ================================================= */}

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

              {/* =================================================
                  بيانات المتجر
                  ================================================= */}

              {mode ===
                "signup" &&
              accountType ===
                "vendor" ? (
                <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />

                    <div>
                      <h2 className="text-sm font-bold text-foreground">
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

                  <div className="flex items-start gap-2 rounded-xl bg-background/70 p-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                    <p className="text-[10px] leading-5 text-muted-foreground">
                      بعد إنشاء الحساب سيتم تفعيل لوحة التاجر وتمكينك من إدارة المنتجات والمتجر.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* =================================================
                  الشروط والأحكام
                  ================================================= */}

              {mode === "signup" ? (
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-secondary/50 p-3">
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
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />

                  <span className="text-xs leading-5 text-foreground">
                    أوافق على{" "}
                    <Link
                      to="/page/$slug"
                      params={{
                        slug: "terms",
                      }}
                      className="font-bold text-primary underline"
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

              {/* =================================================
                  زر الدخول / التسجيل
                  ================================================= */}

              <button
                type="submit"
                disabled={
                  busy ||
                  loading
                }
                className="h-12 w-full rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {busy
                  ? "جارٍ المعالجة..."
                  : mode ===
                      "login"
                    ? accountType ===
                      "courier"
                      ? "دخول عامل التوصيل"
                      : "تسجيل الدخول"
                    : accountType ===
                        "vendor"
                      ? "إنشاء حساب التاجر"
                      : "إنشاء حساب العميل"}
              </button>
            </form>

            {/* =================================================
                Google
                ================================================= */}

            {mode === "login" &&
            accountType !==
              "courier" ? (
              <>
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
                  className="flex h-12 w-full items-center justify-center rounded-2xl border border-border bg-card text-sm text-foreground"
                >
                  الدخول بحساب جوجل
                </button>
              </>
            ) : null}

            {/* =================================================
                التحويل بين الدخول والتسجيل
                ================================================= */}

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
              className="mt-4 w-full text-xs font-semibold text-primary"
            >
              {mode === "login"
                ? "ليس لديك حساب؟ إنشاء حساب جديد"
                : "لديك حساب بالفعل؟ تسجيل الدخول"}
            </button>

            {/* =================================================
                ملاحظة عامل التوصيل
                ================================================= */}

            {mode === "login" &&
            accountType ===
              "courier" ? (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                <p className="text-[10px] leading-5 text-muted-foreground">
                  حسابات عمال التوصيل يتم إنشاؤها
                  وإدارتها من لوحة الإدارة فقط.
                  إذا كان لديك حساب، استخدم رقم
                  الهاتف وكلمة المرور المخصصة لك.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
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
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-center transition ${
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-secondary"
      }`}
    >
      <div className="text-primary">
        {icon}
      </div>

      <p className="mt-2 text-sm font-bold text-foreground">
        {title}
      </p>

      <p className="mt-1 text-[10px] text-muted-foreground">
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
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold text-foreground"
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
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-muted-foreground"
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
  "h-11 w-full rounded-2xl border border-border bg-secondary px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
