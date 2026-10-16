import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Bike, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, ShoppingBag, Sparkles, Store, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { isValidYemeniPhone, normalizeYemeniPhone } from "@/lib/phone";
import { supabase } from "@/integrations/supabase/client";
import { YEMEN_GOVERNORATES } from "@/lib/yemen";
import { BrandLogo } from "@/components/brand-logo";
import { VendorLogoCropper } from "@/components/vendor/vendor-logo-cropper";
import { LocationPicker } from "@/components/location-picker";
import authBg from "@/assets/auth-bg.jpg";

type Search = { redirect?: string };
type AccountType = "customer" | "vendor" | "courier";
type Coordinates = { lat: number; lng: number };
export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => ({ redirect: typeof search.redirect === "string" && search.redirect.startsWith("/") ? search.redirect : undefined }),
  head: () => ({ meta: [{ title: "تسجيل الدخول وإنشاء الحساب | شهارة" }, { name: "description", content: "أنشئ حساب عميل أو تاجر في منصة شهارة، أو سجل الدخول كعامل توصيل." }] }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, role, signIn, signUp, refreshAuthState, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [accountType, setAccountType] = useState<AccountType>("customer");
  const [step, setStep] = useState(1);
  const [vendorAuthCreated, setVendorAuthCreated] = useState(false);
  const [vendorSetupInProgress, setVendorSetupInProgress] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [province, setProvince] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [district, setDistrict] = useState("");
  const [addressDetails, setAddressDetails] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [currency, setCurrency] = useState<"YER" | "SAR">("YER");
  const [payoutMethod, setPayoutMethod] = useState<"kuraimi" | "jeeb" | "onecash">("kuraimi");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const checks = useMemo(() => [
    ["8 أحرف على الأقل", password.length >= 8],
    ["حرف كبير A–Z", /[A-Z]/.test(password)],
    ["حرف صغير a–z", /[a-z]/.test(password)],
    ["رقم 0–9", /\d/.test(password)],
    ["رمز خاص !@#$", /[^A-Za-z0-9]/.test(password)],
  ] as [string, boolean][], [password]);
  const strongPassword = checks.every((x) => x[1]);
  const isLogin = mode === "login";
  const vendorSignup = mode === "signup" && accountType === "vendor";

  useEffect(() => {
    if (!user || loading || (vendorSetupInProgress && mode === "signup" && accountType === "vendor")) return;
    const home = role === "courier" ? "/courier" : role === "vendor" ? "/merchant/dashboard" : role === "admin" ? "/admin" : "/account";
    const safe = redirect && redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.startsWith("/auth") && (!role || role === "customer") ? redirect : null;
    void navigate({ to: safe ?? home, replace: true });
  }, [user, role, redirect, navigate, loading, vendorSetupInProgress, mode, accountType]);

  const cleanPhone = (value: string) => value.replace(/[^\d]/g, "").replace(/^00967/, "").replace(/^967/, "").replace(/^0/, "").slice(0, 9);
  function reset() {
    setStep(1); setVendorAuthCreated(false); setVendorSetupInProgress(false); setFirstName(""); setSecondName(""); setLastName(""); setPhone(""); setEmail(""); setProvince("");
    setPassword(""); setConfirmPassword(""); setAcceptedTerms(false); setStoreName(""); setOwnerName(""); setManagerName("");
    setManagerPhone(""); setStorePhone(""); setDistrict(""); setAddressDetails(""); setStoreDescription(""); setCurrency("YER");
    setPayoutMethod("kuraimi"); setPayoutAccount(""); setLogoUrl(""); setLocation(null); setShowPassword(false); setShowConfirmPassword(false);
  }
  function switchMode(next: "login" | "signup") { setMode(next); if (next === "signup") setAccountType("customer"); reset(); }

  async function googleAuth() {
    if (mode === "signup" && accountType === "vendor") { toast.error("إنشاء حساب التاجر يتطلب استكمال بيانات المتجر من النموذج."); return; }
    try {
      const callback = new URL("/auth", window.location.origin);
      if (redirect) callback.searchParams.set("redirect", redirect);
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback.toString() } });
      if (error) toast.error(error.message || "تعذر الاتصال بحساب جوجل.");
    } catch (error) { console.error(error); toast.error("تعذر بدء تسجيل الدخول بحساب جوجل."); }
  }

  function validateVendorStep(which: number) {
    if (which === 1) {
      if ([firstName, secondName, lastName].some((v) => v.trim().length < 2)) { toast.error("أدخل الاسم الثلاثي كاملاً."); return false; }
      if (!isValidYemeniPhone(phone)) { toast.error("أدخل رقم هاتف يمنيًا صحيحًا من 9 أرقام."); return false; }
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error("تحقق من صيغة البريد الإلكتروني."); return false; }
      if (!strongPassword) { toast.error("أكمل متطلبات قوة كلمة المرور الظاهرة أسفل الحقل."); return false; }
      if (password !== confirmPassword) { toast.error("كلمتا المرور غير متطابقتين."); return false; }
      if (!acceptedTerms) { toast.error("يجب الموافقة على الشروط والأحكام."); return false; }
    }
    if (which === 2) {
      if (!storeName.trim() || !ownerName.trim() || !managerName.trim()) { toast.error("اسم المتجر والمالك والمدير مطلوبة."); return false; }
      if (!province || !district.trim() || !addressDetails.trim()) { toast.error("أدخل المحافظة والمديرية والعنوان التفصيلي."); return false; }
      if (!isValidYemeniPhone(storePhone) || !isValidYemeniPhone(managerPhone)) { toast.error("تحقق من رقم الهاتف الرسمي ورقم هاتف المدير."); return false; }
      if (!payoutAccount.trim()) { toast.error("أدخل رقم حساب/محفظة استلام المستحقات."); return false; }
      if (storeDescription.length > 500) { toast.error("وصف المتجر يجب ألا يتجاوز 500 حرف."); return false; }
    }
    if (which === 3 && !location) { toast.error("حدد موقع المتجر على الخريطة أو استخدم موقعك الحالي."); return false; }
    return true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (vendorSignup && step < 3) {
      if (!validateVendorStep(step)) return;
      if (step === 1 && !vendorAuthCreated) {
        setBusy(true);
        setVendorSetupInProgress(true);
        try {
          const accountResult = await signUp({
            phone: cleanPhone(phone),
            fullName: `${firstName.trim()} ${secondName.trim()} ${lastName.trim()}`,
            password,
          });
          if (accountResult.error) {
            toast.error(accountResult.error);
            setVendorSetupInProgress(false);
            return;
          }
          setVendorAuthCreated(true);
          toast.success("تم إنشاء حساب الدخول. أكمل بيانات المتجر لحفظها.");
          setStep(2);
        } catch (error) {
          console.error("[Auth] vendor auth creation failed:", error);
          toast.error(error instanceof Error ? error.message : "تعذر إنشاء حساب التاجر.");
          setVendorSetupInProgress(false);
        } finally {
          setBusy(false);
        }
      } else {
        setStep((v) => v + 1);
      }
      return;
    }
    if (mode === "signup") {
      if (accountType === "courier") { toast.error("إنشاء حساب عامل التوصيل متاح من لوحة الإدارة فقط."); setAccountType("customer"); return; }
      if (vendorSignup) {
        if (![1, 2, 3].every(validateVendorStep)) return;
      } else {
        if ([firstName, secondName, lastName].some((v) => v.trim().length < 2)) { toast.error("أدخل الاسم الثلاثي كاملاً."); return; }
        if (!isValidYemeniPhone(phone)) { toast.error("أدخل رقم هاتف يمنيًا صحيحًا."); return; }
        if (!province) { toast.error("اختر المحافظة."); return; }
        if (!strongPassword) { toast.error("كلمة المرور لا تستوفي متطلبات الأمان."); return; }
        if (password !== confirmPassword) { toast.error("كلمتا المرور غير متطابقتين."); return; }
        if (!acceptedTerms) { toast.error("يجب الموافقة على الشروط والأحكام."); return; }
      }
    } else if (!isValidYemeniPhone(phone)) { toast.error("أدخل رقم هاتف يمنيًا صحيحًا."); return; }

    setBusy(true);
    try {
      const result = isLogin
        ? await signIn({ phone: cleanPhone(phone), password })
        : vendorSignup && vendorAuthCreated
          ? { error: null }
          : await signUp({ phone: cleanPhone(phone), fullName: `${firstName.trim()} ${secondName.trim()} ${lastName.trim()}`, password });
      if (result.error) { toast.error(result.error); return; }

      if (mode === "signup" && accountType === "vendor") {
        const currentUser = (await supabase.auth.getUser()).data.user;
        if (!currentUser) { toast.error("لم تُفتح جلسة المستخدم بعد. سجّل الدخول ثم أعد إكمال تسجيل التاجر."); return; }
        const { error } = await (supabase as any).rpc("register_vendor_account", {
          p_store_name: storeName.trim(), p_city: province, p_phone: cleanPhone(storePhone),
          p_description: storeDescription.trim(), p_first_name: firstName.trim(), p_second_name: secondName.trim(),
          p_last_name: lastName.trim(), p_province: province, p_contact_email: email.trim() || null,
          p_accepted_terms: acceptedTerms, p_owner_name: ownerName.trim(), p_manager_name: managerName.trim(),
          p_manager_phone: cleanPhone(managerPhone), p_store_phone: cleanPhone(storePhone), p_district: district.trim(),
          p_default_currency: currency, p_payout_method: payoutMethod, p_payout_account_number: payoutAccount.trim(),
          p_address_details: addressDetails.trim(), p_latitude: location?.lat ?? null, p_longitude: location?.lng ?? null,
          p_logo_url: logoUrl || null,
        });
        if (error) { console.error("[Auth] vendor registration failed:", error); toast.error(`تعذر حفظ بيانات التاجر: ${error.message}`); return; }
        await refreshAuthState();
        setVendorSetupInProgress(false);
        toast.success("تم حفظ حساب التاجر وبيانات المتجر.");
        await navigate({ to: "/merchant/dashboard", replace: true });
        return;
      }
      if (mode === "signup") {
        const currentUser = (await supabase.auth.getUser()).data.user;
        const { error } = await supabase.from("profiles").update({
          first_name: firstName.trim(), second_name: secondName.trim(), last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${secondName.trim()} ${lastName.trim()}`, phone: cleanPhone(phone),
          province, contact_email: email.trim() || null, accepted_terms: true,
        }).eq("id", currentUser?.id ?? "");
        if (error) { console.error("[Auth] profile completion failed:", error); toast.error("تم إنشاء الحساب لكن تعذر حفظ الملف الشخصي."); return; }
        await refreshAuthState(); toast.success("تم إنشاء حساب العميل بنجاح."); return;
      }
      await refreshAuthState(); toast.success("تم تسجيل الدخول بنجاح.");
    } catch (error) {
      console.error("[Auth] submit failed:", error);
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally { setBusy(false); }
  }

  return <main dir="rtl" className="relative min-h-[100dvh] overflow-hidden bg-[#071f29] text-white">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0"><img src={authBg} alt="" width={768} height={1344} className="absolute inset-0 h-full w-full object-cover opacity-90" /><div className="absolute inset-0 bg-gradient-to-b from-[#071f29]/70 via-[#071f29]/40 to-[#071f29]/85" /><div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#D65A31]/20 blur-3xl" /></div>
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-[0_30px_100px_rgba(0,0,0,.35)] backdrop-blur-xl lg:grid-cols-[.92fr_1.08fr]">
        <aside className="relative hidden min-h-[760px] bg-[#0A3D50] p-10 lg:flex lg:flex-col lg:justify-between"><div><div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2"><Sparkles className="h-4 w-4 text-[#D65A31]" /><span className="text-xs font-semibold text-white/80">تجربة شهارة الجديدة</span></div><div className="mt-12 flex justify-center"><div className="flex h-36 w-36 items-center justify-center rounded-[2.25rem] border border-white/15 bg-white/[0.08]"><BrandLogo size={104} priority /></div></div><div className="mt-10 text-center"><p className="text-sm text-white/55">شهارة | SHEHARA</p><h2 className="mt-3 text-3xl font-black">تسوّق بلا حدود</h2><p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-white/65">منصة يمنية تجمع العملاء والتجار في تجربة تسوق بسيطة وآمنة.</p></div></div><div className="space-y-3"><Feature icon={<ShoppingBag className="h-4 w-4" />} title="كل احتياجاتك في مكان واحد" text="منتجات وعروض وخدمات أقرب إليك." /><Feature icon={<ShieldCheck className="h-4 w-4" />} title="حسابك تحت الحماية" text="تسجيل آمن وربط مباشر بقاعدة البيانات." /><p className="pt-3 text-center text-[10px] text-white/35">© شهارة للتسوق — تسوّق بلا حدود</p></div></aside>
        <section className="min-w-0 bg-[#f8fafb] text-foreground"><div className="mx-auto w-full max-w-xl p-5 sm:p-8 lg:p-10">
          <div className="mb-7 flex items-center justify-between gap-4"><div className="flex w-full flex-col items-center lg:hidden"><img src="/logo.png" alt="شهارة SHEHARA" width={120} height={120} className="h-28 w-28 rounded-3xl bg-white object-contain p-2 shadow-md" /></div><div className="mr-auto hidden rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#0A3D50] sm:flex">منصة تسوق يمنية</div></div>
          <div className="mb-7"><div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#0E4D64]/[.07] px-3 py-1.5 text-[10px] font-bold text-[#0A3D50]"><LockKeyhole className="h-3.5 w-3.5" />دخول آمن إلى حسابك</div><h1 className="text-2xl font-black text-[#071f29] sm:text-3xl">{isLogin ? "مرحبًا بعودتك" : vendorSignup ? "تسجيل متجر جديد" : "أنشئ حسابك في شهارة"}</h1><p className="mt-2 text-xs leading-6 text-muted-foreground">{isLogin ? "سجّل الدخول واستكمل رحلتك في شهارة." : vendorSignup ? "أكمل الخطوات الثلاث لتسجيل المتجر وحفظ بياناته." : "أنشئ حسابك كعميل وابدأ رحلتك معنا."}</p></div>
          <div className="mb-6 grid grid-cols-2 rounded-2xl border border-black/[.06] bg-white p-1.5 shadow-sm"><ModeButton active={isLogin} onClick={() => switchMode("login")}>تسجيل الدخول</ModeButton><ModeButton active={!isLogin} onClick={() => switchMode("signup")}>إنشاء حساب</ModeButton></div>
          {isLogin ? <div className="mb-6"><p className="mb-2.5 text-[11px] font-bold text-[#071f29]">الدخول إلى</p><div className="grid grid-cols-3 gap-2"><TypeButton active={accountType === "customer"} icon={<User className="h-5 w-5" />} title="عميل" desc="التسوق والطلبات" onClick={() => setAccountType("customer")} /><TypeButton active={accountType === "vendor"} icon={<Store className="h-5 w-5" />} title="تاجر" desc="إدارة متجرك" onClick={() => setAccountType("vendor")} /><TypeButton active={accountType === "courier"} icon={<Bike className="h-5 w-5" />} title="توصيل" desc="تسليم الطلبات" onClick={() => setAccountType("courier")} /></div></div> : <div className="mb-6"><p className="mb-2.5 text-[11px] font-bold text-[#071f29]">نوع الحساب</p><div className="grid grid-cols-2 gap-3"><TypeButton active={accountType === "customer"} icon={<User className="h-5 w-5" />} title="حساب عميل" desc="للتسوق والطلبات" onClick={() => { setAccountType("customer"); setStep(1); }} /><TypeButton active={accountType === "vendor"} icon={<Store className="h-5 w-5" />} title="حساب تاجر" desc="إدارة متجرك" onClick={() => { setAccountType("vendor"); setStep(1); }} /></div></div>}
          {vendorSignup ? <div className="mb-5 grid grid-cols-3 gap-2">{["الحساب", "المتجر والمالية", "الشعار والموقع"].map((name, i) => <div key={name} className={`rounded-xl px-2 py-2 text-center text-[10px] font-black ${step === i + 1 ? "bg-[#0E4D64] text-white" : step > i + 1 ? "bg-[#D65A31]/10 text-[#0E4D64]" : "bg-slate-100 text-slate-500"}`}>{i + 1}. {name}</div>)}</div> : null}
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" ? <><div className="grid gap-3 sm:grid-cols-2"><Field label="الاسم الأول *" id="firstName"><input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={50} className={inputCls} autoComplete="given-name" /></Field><Field label="الاسم الثاني *" id="secondName"><input id="secondName" required value={secondName} onChange={(e) => setSecondName(e.target.value)} maxLength={50} className={inputCls} /></Field></div><Field label="اللقب *" id="lastName"><input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={60} className={inputCls} autoComplete="family-name" /></Field></> : null}
            <Field label="رقم الهاتف اليمني *" id="phone"><div className="relative"><Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0E4D64]/65" /><input id="phone" required value={phone} onChange={(e) => setPhone(cleanPhone(e.target.value))} inputMode="numeric" dir="ltr" maxLength={9} placeholder="7XXXXXXXX" className={`${inputCls} pr-10`} /></div><p className="mt-1 text-[10px] text-muted-foreground">9 أرقام ويبدأ بـ 70 أو 71 أو 73 أو 77.</p></Field>
            {mode === "signup" ? <><Field label="البريد الإلكتروني (اختياري)" id="email"><div className="relative"><Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0E4D64]/65" /><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className={`${inputCls} pr-10`} /></div></Field><Field label="المحافظة *" id="province"><select id="province" required value={province} onChange={(e) => setProvince(e.target.value)} className={inputCls}><option value="">اختر المحافظة</option>{YEMEN_GOVERNORATES.map((p) => <option key={p}>{p}</option>)}</select></Field></> : null}
            <Field label="كلمة المرور *" id="password"><PasswordInput id="password" value={password} show={showPassword} onChange={setPassword} onToggle={() => setShowPassword((v) => !v)} isLogin={isLogin} /></Field>
            {mode === "signup" ? <><div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">{checks.map(([label, valid]) => <p key={label} className={`flex items-center gap-1.5 text-[10px] ${valid ? "text-emerald-700" : "text-slate-500"}`}><CheckCircle2 className="h-3.5 w-3.5" />{label}</p>)}</div><Field label="تأكيد كلمة المرور *" id="confirmPassword"><PasswordInput id="confirmPassword" value={confirmPassword} show={showConfirmPassword} onChange={setConfirmPassword} onToggle={() => setShowConfirmPassword((v) => !v)} isLogin={false} /></Field></> : null}
            {vendorSignup && step === 2 ? <div className="space-y-4 rounded-2xl border border-[#0E4D64]/10 bg-[#0E4D64]/[.035] p-4"><h2 className="flex items-center gap-2 font-black text-[#0E4D64]"><Store className="h-5 w-5" />بيانات المتجر والمالية</h2>
              <Field label="اسم المتجر *" id="storeName"><input id="storeName" required value={storeName} onChange={(e) => setStoreName(e.target.value)} maxLength={120} className={inputCls} /></Field>
              <Field label="اسم مالك المتجر *" id="ownerName"><input id="ownerName" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} maxLength={120} className={inputCls} /></Field>
              <Field label="اسم المدير المسؤول *" id="managerName"><input id="managerName" required value={managerName} onChange={(e) => setManagerName(e.target.value)} maxLength={120} className={inputCls} /></Field>
              <div className="grid gap-3 sm:grid-cols-2"><Field label="هاتف المدير *" id="managerPhone"><input id="managerPhone" required value={managerPhone} onChange={(e) => setManagerPhone(cleanPhone(e.target.value))} inputMode="numeric" dir="ltr" maxLength={9} className={inputCls} /></Field><Field label="هاتف المتجر الرسمي *" id="storePhone"><input id="storePhone" required value={storePhone} onChange={(e) => setStorePhone(cleanPhone(e.target.value))} inputMode="numeric" dir="ltr" maxLength={9} className={inputCls} /></Field></div>
              <div className="grid gap-3 sm:grid-cols-2"><Field label="المحافظة *" id="vendorProvince"><select id="vendorProvince" required value={province} onChange={(e) => setProvince(e.target.value)} className={inputCls}><option value="">اختر المحافظة</option>{YEMEN_GOVERNORATES.map((p) => <option key={p}>{p}</option>)}</select></Field><Field label="المديرية *" id="district"><input id="district" required value={district} onChange={(e) => setDistrict(e.target.value)} maxLength={100} className={inputCls} /></Field></div>
              <Field label="العنوان التفصيلي *" id="addressDetails"><textarea id="addressDetails" required value={addressDetails} onChange={(e) => setAddressDetails(e.target.value)} maxLength={500} className={`${inputCls} h-24 py-3`} placeholder="الحي والشارع وأقرب معلم" /></Field>
              <Field label="وصف المتجر" id="storeDescription"><textarea id="storeDescription" value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} maxLength={500} className={`${inputCls} h-20 py-3`} /></Field>
              <div className="grid gap-3 sm:grid-cols-2"><Field label="العملة الافتراضية" id="currency"><select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value as "YER" | "SAR")} className={inputCls}><option value="YER">ريال يمني (YER)</option><option value="SAR">ريال سعودي (SAR)</option></select></Field><Field label="وسيلة استلام المستحقات" id="payoutMethod"><select id="payoutMethod" value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as "kuraimi" | "jeeb" | "onecash")} className={inputCls}><option value="kuraimi">الكريمي</option><option value="jeeb">جيب</option><option value="onecash">ون كاش</option></select></Field></div>
              <Field label="رقم الحساب / المحفظة *" id="payoutAccount"><input id="payoutAccount" required value={payoutAccount} onChange={(e) => setPayoutAccount(e.target.value)} dir="ltr" maxLength={120} className={inputCls} /></Field>
            </div> : null}
            {vendorSignup && step === 3 ? <div className="space-y-5 rounded-2xl border border-[#0E4D64]/10 bg-[#0E4D64]/[.035] p-4"><h2 className="flex items-center gap-2 font-black text-[#0E4D64]"><MapPin className="h-5 w-5" />الشعار والموقع</h2><VendorLogoCropper userId={user?.id ?? ""} onUploaded={setLogoUrl} value={logoUrl} disabled={busy} /><div><p className="mb-2 text-sm font-bold">حدد موقع المتجر *</p><LocationPicker value={location} onChange={setLocation} onConfirmed={(d) => { setLocation({ lat: d.lat, lng: d.lng }); if (d.address && !addressDetails.trim()) setAddressDetails(d.address); toast.success("تم اعتماد موقع المتجر."); }} height={300} /></div>{location ? <p dir="ltr" className="rounded-lg bg-white p-3 text-xs text-slate-600">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p> : null}<p className="text-xs leading-6 text-slate-500">اسحب الدبوس أو اضغط على الخريطة. تُحفظ الإحداثيات ضمن بيانات المتجر.</p></div> : null}
            {mode === "signup" ? <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/[.06] bg-white p-3.5 shadow-sm"><input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0E4D64]" /><span className="text-xs leading-5">أوافق على <Link to="/page/$slug" params={{ slug: "terms" }} className="font-bold text-[#0E4D64] underline">الشروط والأحكام</Link> وسياسة استخدام شهارة.</span></label> : null}
            <div className="flex gap-2">{vendorSignup && step > 1 ? <button type="button" onClick={() => setStep((v) => v - 1)} disabled={busy} className="h-12 flex-1 rounded-2xl border border-[#0E4D64]/20 bg-white text-sm font-black text-[#0E4D64]">السابق</button> : null}<button type="submit" disabled={busy || loading} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0E4D64] text-sm font-black text-white shadow-sm hover:bg-[#0A3D50] disabled:opacity-60">{busy ? "جارٍ الحفظ..." : isLogin ? accountType === "courier" ? "دخول عامل التوصيل" : "تسجيل الدخول" : vendorSignup && step < 3 ? "التالي" : accountType === "vendor" ? "إنشاء حساب التاجر" : "إنشاء حساب العميل"}<ArrowLeft className="h-4 w-4" /></button></div>
          </form>
          {accountType !== "courier" && !vendorSignup ? <><div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-black/[.07]" /><span className="text-[10px] text-muted-foreground">أو</span><span className="h-px flex-1 bg-black/[.07]" /></div><button type="button" onClick={googleAuth} className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-black/[.07] bg-white text-sm font-bold">G　{isLogin ? "الدخول بحساب جوجل" : "إنشاء حساب بواسطة جوجل"}</button></> : null}
          <button type="button" onClick={() => switchMode(isLogin ? "signup" : "login")} className="mt-5 flex w-full items-center justify-center gap-2 text-xs font-bold text-[#0E4D64]">{isLogin ? "ليس لديك حساب؟ إنشاء حساب جديد" : "لديك حساب بالفعل؟ تسجيل الدخول"}<ArrowLeft className="h-3.5 w-3.5" /></button>
          {isLogin && accountType === "courier" ? <p className="mt-5 rounded-2xl bg-[#0E4D64]/[.04] p-3 text-xs leading-6 text-muted-foreground"><ShieldCheck className="inline h-4 w-4" /> حسابات عمال التوصيل يتم إنشاؤها من لوحة الإدارة فقط.</p> : null}
          <div className="mt-7 flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground"><LockKeyhole className="h-3 w-3" />بياناتك محمية ويتم التعامل معها بأمان.</div>
        </div></section>
      </div>
    </div>
  </main>;
}
function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.05] p-3.5"><div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-[#D65A31]/10 text-[#D65A31]">{icon}</div><div><p className="text-xs font-bold text-white/90">{title}</p><p className="mt-1 text-[10px] leading-5 text-white/45">{text}</p></div></div>; }
function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" onClick={onClick} className={`h-10 rounded-xl text-xs font-black ${active ? "bg-[#0E4D64] text-white" : "text-muted-foreground hover:bg-black/[.03]"}`}>{children}</button>; }
function TypeButton({ active, icon, title, desc, onClick }: { active: boolean; icon: ReactNode; title: string; desc: string; onClick: () => void }) { return <button type="button" onClick={onClick} className={`rounded-2xl border p-3.5 text-right ${active ? "border-[#0E4D64]/25 bg-[#0E4D64]/[.07]" : "border-black/[.06] bg-white"}`}><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#0E4D64]/[.07] text-[#0E4D64]">{icon}</div><p className="text-xs font-black text-[#071f29]">{title}</p><p className="mt-1 text-[9px] text-muted-foreground">{desc}</p></button>; }
function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) { return <div><label htmlFor={id} className="text-[11px] font-bold text-[#071f29]">{label}</label><div className="mt-1.5">{children}</div></div>; }
function PasswordInput({ id, value, show, onChange, onToggle, isLogin }: { id: string; value: string; show: boolean; onChange: (value: string) => void; onToggle: () => void; isLogin: boolean }) { return <div className="relative"><input id={id} type={show ? "text" : "password"} required value={value} onChange={(e) => onChange(e.target.value)} maxLength={72} autoComplete={isLogin ? "current-password" : "new-password"} className={`${inputCls} pl-12`} /><button type="button" onClick={onToggle} aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-muted-foreground">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>; }
const inputCls = "h-11 w-full rounded-2xl border border-black/[.07] bg-white px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#0E4D64]/35 focus:ring-4 focus:ring-[#0E4D64]/[.07]";
