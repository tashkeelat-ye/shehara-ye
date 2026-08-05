import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, Field, btnCls, inputCls } from "@/components/admin-ui";
import { fetchSettings, type SiteSettings } from "@/lib/store";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [s, setS] = useState<SiteSettings | null>(null);

  useEffect(() => {
    void (async () => setS(await fetchSettings()))();
  }, []);

  async function save() {
    if (!s) return;
    const { error } = await supabase
      .from("site_settings")
      .update({
        store_name: s.store_name,
        tagline: s.tagline,
        logo_url: s.logo_url,
        phone: s.phone,
        whatsapp: s.whatsapp,
        email: s.email,
        address: s.address,
        facebook: s.facebook,
        instagram: s.instagram,
        telegram: s.telegram,
        tiktok: s.tiktok,
        twitter: s.twitter,
        footer_note: s.footer_note,
        footer_copyright: s.footer_copyright,
        delivery_fee: s.delivery_fee,
        sar_rate: s.sar_rate,
        is_open: s.is_open,
        closed_message: s.closed_message,
        announcement_text: s.announcement_text,
        announcement_link: s.announcement_link,
        announcement_active: s.announcement_active,
      })
      .eq("id", true);
    if (error) toast.error("تعذّر الحفظ: " + error.message);
    else toast.success("تم حفظ إعدادات المتجر");
  }

  if (!s) return <p className="text-xs text-muted-foreground">جارٍ التحميل...</p>;

  const fields: { key: keyof SiteSettings; label: string; ltr?: boolean }[] = [
    { key: "store_name", label: "اسم المتجر" },
    { key: "tagline", label: "الشعار النصي" },
    { key: "phone", label: "رقم الهاتف", ltr: true },
    { key: "whatsapp", label: "رقم الواتساب", ltr: true },
    { key: "email", label: "البريد الإلكتروني", ltr: true },
    { key: "address", label: "العنوان" },
    { key: "facebook", label: "رابط فيسبوك", ltr: true },
    { key: "instagram", label: "رابط إنستغرام", ltr: true },
    { key: "telegram", label: "رابط تيليجرام", ltr: true },
    { key: "tiktok", label: "رابط تيك توك", ltr: true },
    { key: "twitter", label: "رابط إكس (تويتر)", ltr: true },
    { key: "footer_note", label: "نص تعريفي في الفوتر" },
    { key: "footer_copyright", label: "نص حقوق النشر" },
  ];

  return (
    <AdminCard title="إعدادات المتجر">
      <div className="mb-4 flex items-center gap-3">
        <BrandLogo size={64} />
        <p className="text-[11px] text-muted-foreground">
          الشعار الرسمي المعتمد لتشكيلات. يمكنك وضع رابط شعار بديل بالأسفل.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <input
              className={inputCls}
              dir={f.ltr ? "ltr" : undefined}
              value={String(s[f.key] ?? "")}
              maxLength={200}
              onChange={(e) => setS({ ...s, [f.key]: e.target.value })}
            />
          </Field>
        ))}
        <Field label="رابط شعار مخصّص (اختياري)">
          <input
            dir="ltr"
            className={inputCls}
            value={s.logo_url}
            maxLength={500}
            onChange={(e) => setS({ ...s, logo_url: e.target.value })}
          />
        </Field>
        <Field label="سعر تحويل الريال السعودي (كم ريال يمني لكل ١ ر.س)">
          <input
            type="number"
            step="0.01"
            className={inputCls}
            value={s.sar_rate}
            onChange={(e) => setS({ ...s, sar_rate: Number(e.target.value) })}
          />
        </Field>
        <Field label="نص شريط الإعلانات">
          <input
            className={inputCls}
            value={s.announcement_text}
            maxLength={200}
            onChange={(e) => setS({ ...s, announcement_text: e.target.value })}
          />
        </Field>
        <Field label="رابط شريط الإعلانات (اختياري)">
          <input
            dir="ltr"
            className={inputCls}
            value={s.announcement_link}
            maxLength={300}
            onChange={(e) => setS({ ...s, announcement_link: e.target.value })}
          />
        </Field>
        <Field label="رسالة إغلاق المتجر">
          <input
            className={inputCls}
            value={s.closed_message}
            maxLength={200}
            onChange={(e) => setS({ ...s, closed_message: e.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            checked={s.announcement_active}
            onChange={(e) => setS({ ...s, announcement_active: e.target.checked })}
          />
          إظهار شريط الإعلانات
        </label>
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            checked={s.is_open}
            onChange={(e) => setS({ ...s, is_open: e.target.checked })}
          />
          المتجر مفتوح لاستقبال الطلبات
        </label>
        <Field label="تكلفة التوصيل (ر.ي)">
          <input
            type="number"
            className={inputCls}
            value={s.delivery_fee}
            onChange={(e) => setS({ ...s, delivery_fee: Number(e.target.value) })}
          />
        </Field>
      </div>
      <button type="button" className={`${btnCls} mt-3`} onClick={save}>
        حفظ الإعدادات
      </button>
    </AdminCard>
  );
}
