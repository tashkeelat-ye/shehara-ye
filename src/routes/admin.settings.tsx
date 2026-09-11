import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Eye,
  FileText,
  Save,
  Settings2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  AdminCard,
  Field,
  btnCls,
  inputCls,
} from "@/components/admin-ui";

import {
  fetchSettings,
  type SiteSettings,
} from "@/lib/store";

import { BrandLogo } from "@/components/brand-logo";

import {
  DEFAULT_INVOICE_SETTINGS,
  fetchInvoiceSettings,
  updateInvoiceSettings,
  type InvoiceSettings,
} from "@/lib/invoice-settings";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [s, setS] = useState<SiteSettings | null>(null);
  const [invoice, setInvoice] = useState<InvoiceSettings>(
    DEFAULT_INVOICE_SETTINGS,
  );

  const [savingStore, setSavingStore] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetchSettings(),
      fetchInvoiceSettings(),
    ]).then(([storeSettings, invoiceSettings]) => {
      setS(storeSettings);
      setInvoice(invoiceSettings);
    });
  }, []);

  async function saveStore() {
    if (!s) return;

    setSavingStore(true);

    try {
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

      if (error) {
        throw error;
      }

      toast.success("تم حفظ إعدادات المتجر");
    } catch (error) {
      toast.error(
        "تعذّر حفظ إعدادات المتجر: " +
          (error instanceof Error
            ? error.message
            : "خطأ غير معروف"),
      );
    } finally {
      setSavingStore(false);
    }
  }

  async function saveInvoice() {
    setSavingInvoice(true);

    try {
      const saved = await updateInvoiceSettings(invoice);

      setInvoice(saved);

      toast.success("تم حفظ إعدادات الفاتورة بنجاح");
    } catch (error) {
      toast.error(
        "تعذّر حفظ إعدادات الفاتورة: " +
          (error instanceof Error
            ? error.message
            : "خطأ غير معروف"),
      );
    } finally {
      setSavingInvoice(false);
    }
  }

  if (!s) {
    return (
      <p className="text-xs text-muted-foreground">
        جارٍ تحميل إعدادات لوحة التحكم...
      </p>
    );
  }

  const fields: {
    key: keyof SiteSettings;
    label: string;
    ltr?: boolean;
  }[] = [
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
    { key: "twitter", label: "رابط إكس", ltr: true },
    { key: "footer_note", label: "نص تعريفي في الفوتر" },
    { key: "footer_copyright", label: "نص حقوق النشر" },
  ];

  const setInvoiceValue = <K extends keyof InvoiceSettings>(
    key: K,
    value: InvoiceSettings[K],
  ) => {
    setInvoice((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-5">
      {/* Store settings */}
      <AdminCard title="إعدادات المتجر">
        <div className="mb-4 flex items-center gap-3">
          <BrandLogo size={64} />

          <p className="text-[11px] text-muted-foreground">
            الشعار الرسمي المعتمد لشهارة.
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
                onChange={(e) =>
                  setS({
                    ...s,
                    [f.key]: e.target.value,
                  })
                }
              />
            </Field>
          ))}

          <Field label="رابط شعار مخصص">
            <input
              dir="ltr"
              className={inputCls}
              value={s.logo_url}
              maxLength={500}
              onChange={(e) =>
                setS({
                  ...s,
                  logo_url: e.target.value,
                })
              }
            />
          </Field>

          <Field label="سعر تحويل الريال السعودي">
            <input
              type="number"
              step="0.01"
              className={inputCls}
              value={s.sar_rate}
              onChange={(e) =>
                setS({
                  ...s,
                  sar_rate: Number(e.target.value),
                })
              }
            />
          </Field>

          <Field label="نص شريط الإعلانات">
            <input
              className={inputCls}
              value={s.announcement_text}
              maxLength={200}
              onChange={(e) =>
                setS({
                  ...s,
                  announcement_text: e.target.value,
                })
              }
            />
          </Field>

          <Field label="رابط شريط الإعلانات">
            <input
              dir="ltr"
              className={inputCls}
              value={s.announcement_link}
              maxLength={300}
              onChange={(e) =>
                setS({
                  ...s,
                  announcement_link: e.target.value,
                })
              }
            />
          </Field>

          <Field label="رسالة إغلاق المتجر">
            <input
              className={inputCls}
              value={s.closed_message}
              maxLength={200}
              onChange={(e) =>
                setS({
                  ...s,
                  closed_message: e.target.value,
                })
              }
            />
          </Field>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={s.announcement_active}
              onChange={(e) =>
                setS({
                  ...s,
                  announcement_active: e.target.checked,
                })
              }
            />
            إظهار شريط الإعلانات
          </label>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={s.is_open}
              onChange={(e) =>
                setS({
                  ...s,
                  is_open: e.target.checked,
                })
              }
            />
            المتجر مفتوح لاستقبال الطلبات
          </label>

          <Field label="تكلفة التوصيل">
            <input
              type="number"
              className={inputCls}
              value={s.delivery_fee}
              onChange={(e) =>
                setS({
                  ...s,
                  delivery_fee: Number(e.target.value),
                })
              }
            />
          </Field>
        </div>

        <button
          type="button"
          className={`${btnCls} mt-4 inline-flex items-center gap-2`}
          onClick={saveStore}
          disabled={savingStore}
        >
          <Save className="h-4 w-4" />
          {savingStore
            ? "جارٍ الحفظ..."
            : "حفظ إعدادات المتجر"}
        </button>
      </AdminCard>

      {/* Invoice settings */}
      <AdminCard title="إعدادات الفواتير">
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#0D3B4D]/10 bg-[#F6F2EE]/60 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0D3B4D] text-white">
            <FileText className="h-5 w-5 text-[#E2723A]" />
          </div>

          <div>
            <h3 className="text-sm font-black text-[#0D3B4D]">
              نظام الفاتورة الإلكترونية
            </h3>

            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              تحكم كامل في شكل ومحتوى الفاتورة التي تظهر
              للعميل والإدارة والطباعة.
            </p>
          </div>
        </div>

        {/* Main */}
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-[#E2723A]" />
              <h3 className="text-sm font-bold">
                المعلومات الأساسية
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="عنوان الفاتورة">
                <input
                  className={inputCls}
                  value={invoice.invoice_title}
                  maxLength={100}
                  onChange={(e) =>
                    setInvoiceValue(
                      "invoice_title",
                      e.target.value,
                    )
                  }
                />
              </Field>

              <Field label="العنوان الفرعي">
                <input
                  className={inputCls}
                  value={invoice.invoice_subtitle}
                  maxLength={150}
                  onChange={(e) =>
                    setInvoiceValue(
                      "invoice_subtitle",
                      e.target.value,
                    )
                  }
                />
              </Field>

              <Field label="اسم المتجر في الفاتورة">
                <input
                  className={inputCls}
                  value={invoice.store_name}
                  maxLength={150}
                  onChange={(e) =>
                    setInvoiceValue(
                      "store_name",
                      e.target.value,
                    )
                  }
                />
              </Field>

              <Field label="الشعار النصي">
                <input
                  className={inputCls}
                  value={invoice.store_tagline}
                  maxLength={150}
                  onChange={(e) =>
                    setInvoiceValue(
                      "store_tagline",
                      e.target.value,
                    )
                  }
                />
              </Field>

              <Field label="العنوان">
                <input
                  className={inputCls}
                  value={invoice.store_address}
                  maxLength={250}
                  onChange={(e) =>
                    setInvoiceValue(
                      "store_address",
                      e.target.value,
                    )
                  }
                />
              </Field>

              <Field label="الهاتف">
                <input
                  className={inputCls}
                  dir="ltr"
                  value={invoice.store_phone}
                  maxLength={50}
                  onChange={(e) =>
                    setInvoiceValue(
                      "store_phone",
                      e.target.value,
                    )
                  }
                />
              </Field>

              <Field label="البريد الإلكتروني">
                <input
                  className={inputCls}
                  dir="ltr"
                  value={invoice.store_email}
                  maxLength={150}
                  onChange={(e) =>
                    setInvoiceValue(
                      "store_email",
                      e.target.value,
                    )
                  }
                />
              </Field>

              <Field label="السجل التجاري">
                <input
                  className={inputCls}
                  value={invoice.commercial_registration}
                  maxLength={100}
                  onChange={(e) =>
                    setInvoiceValue(
                      "commercial_registration",
                      e.target.value,
                    )
                  }
                />
              </Field>

              <Field label="الرقم الضريبي">
                <input
                  className={inputCls}
                  value={invoice.tax_number}
                  maxLength={100}
                  onChange={(e) =>
                    setInvoiceValue(
                      "tax_number",
                      e.target.value,
                    )
                  }
                />
              </Field>

              <Field label="رابط الشعار">
                <input
                  className={inputCls}
                  dir="ltr"
                  value={invoice.logo_url}
                  maxLength={500}
                  onChange={(e) =>
                    setInvoiceValue(
                      "logo_url",
                      e.target.value,
                    )
                  }
                />
              </Field>
            </div>
          </section>

          {/* Text */}
          <section>
            <h3 className="mb-3 text-sm font-bold">
              النصوص
            </h3>

            <div className="grid gap-3">
              <Field label="رسالة أعلى الفاتورة">
                <textarea
                  className={`${inputCls} min-h-20 resize-y`}
                  value={invoice.header_note}
                  maxLength={500}
                  onChange={(e) =>
                    setInvoiceValue(
                      "header_note",
                      e.target.value,
                    )
                  }
                />
              </Field>

              <Field label="رسالة الشكر">
                <textarea
                  className={`${inputCls} min-h-20 resize-y`}
                  value={invoice.thank_you_message}
                  maxLength={300}
                  onChange={(e) =>
                    setInvoiceValue(
                      "thank_you_message",
                      e.target.value,
                    )
                  }
                />
              </Field>

              <Field label="نص أسفل الفاتورة">
                <textarea
                  className={`${inputCls} min-h-20 resize-y`}
                  value={invoice.footer_note}
                  maxLength={500}
                  onChange={(e) =>
                    setInvoiceValue(
                      "footer_note",
                      e.target.value,
                    )
                  }
                />
              </Field>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <h3 className="mb-3 text-sm font-bold">
              المظهر
            </h3>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="اللون الأساسي">
                <input
                  type="text"
                  dir="ltr"
                  className={inputCls}
                  value={invoice.primary_color}
                  onChange={(e) =>
                    setInvoiceValue(
                      "primary_color",
                      e.target.value,
                    )
                  }
                />
              </Field>

              <Field label="اللون الداكن">
                <input
                  type="text"
                  dir="ltr"
                  className={inputCls}
                  value={invoice.secondary_color}
                  onChange={(e) =>
                    setInvoiceValue(
                      "secondary_color",
                      e.target.value,
                    )
                  }
                />
              </Field>

              <Field label="لون التمييز">
                <input
                  type="text"
                  dir="ltr"
                  className={inputCls}
                  value={invoice.accent_color}
                  onChange={(e) =>
                    setInvoiceValue(
                      "accent_color",
                      e.target.value,
                    )
                  }
                />
              </Field>

              <Field label="حجم الفاتورة">
                <select
                  className={inputCls}
                  value={invoice.paper_size}
                  onChange={(e) =>
                    setInvoiceValue(
                      "paper_size",
                      e.target.value as
                        | "A4"
                        | "thermal",
                    )
                  }
                >
                  <option value="A4">
                    A4 — قياسي
                  </option>
                  <option value="thermal">
                    Thermal — إيصال حراري
                  </option>
                </select>
              </Field>

              <Field label="بادئة رقم الفاتورة">
                <input
                  className={inputCls}
                  dir="ltr"
                  value={invoice.invoice_prefix}
                  maxLength={20}
                  onChange={(e) =>
                    setInvoiceValue(
                      "invoice_prefix",
                      e.target.value,
                    )
                  }
                />
              </Field>
            </div>
          </section>

          {/* Visibility */}
          <section>
            <h3 className="mb-3 text-sm font-bold">
              عناصر الفاتورة
            </h3>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [
                  "show_invoice_number",
                  "إظهار رقم الفاتورة",
                ],
                [
                  "show_order_number",
                  "إظهار رقم الطلب",
                ],
                [
                  "show_invoice_date",
                  "إظهار التاريخ",
                ],
                [
                  "show_customer_details",
                  "بيانات العميل",
                ],
                [
                  "show_customer_phone",
                  "هاتف العميل",
                ],
                [
                  "show_customer_address",
                  "عنوان العميل",
                ],
                [
                  "show_store_details",
                  "بيانات المتجر",
                ],
                [
                  "show_commercial_registration",
                  "السجل التجاري",
                ],
                [
                  "show_tax_number",
                  "الرقم الضريبي",
                ],
                [
                  "show_product_images",
                  "صور المنتجات",
                ],
                [
                  "show_product_description",
                  "وصف المنتجات",
                ],
                [
                  "show_payment_method",
                  "طريقة الدفع",
                ],
                [
                  "show_payment_status",
                  "حالة الدفع",
                ],
                [
                  "show_notes",
                  "ملاحظات الطلب",
                ],
                [
                  "show_qr_code",
                  "QR Code",
                ],
                [
                  "show_delivery_fee",
                  "رسوم التوصيل",
                ],
                [
                  "show_discount",
                  "الخصم",
                ],
                [
                  "invoice_footer_enabled",
                  "تذييل الفاتورة",
                ],
              ].map(([key, label]) => {
                const typedKey =
                  key as keyof InvoiceSettings;

                return (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background p-3 text-xs transition hover:border-[#E2723A]/40"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(
                        invoice[typedKey],
                      )}
                      onChange={(e) =>
                        setInvoiceValue(
                          typedKey,
                          e.target.checked as never,
                        )
                      }
                    />

                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Enable */}
          <section className="rounded-2xl border border-[#0D3B4D]/10 bg-[#F6F2EE]/60 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={invoice.enabled}
                onChange={(e) =>
                  setInvoiceValue(
                    "enabled",
                    e.target.checked,
                  )
                }
              />

              <div>
                <p className="text-sm font-bold text-[#0D3B4D]">
                  تفعيل نظام الفواتير
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  عند التعطيل لن تظهر واجهة الفاتورة
                  للمستخدمين.
                </p>
              </div>
            </label>
          </section>

          {/* Preview */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${btnCls} inline-flex items-center gap-2`}
              onClick={() => {
                window.open(
                  "/invoice",
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              <Eye className="h-4 w-4" />
              معاينة الفاتورة
            </button>

            <button
              type="button"
              className={`${btnCls} inline-flex items-center gap-2`}
              onClick={saveInvoice}
              disabled={savingInvoice}
            >
              <Save className="h-4 w-4" />
              {savingInvoice
                ? "جارٍ الحفظ..."
                : "حفظ إعدادات الفاتورة"}
            </button>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
