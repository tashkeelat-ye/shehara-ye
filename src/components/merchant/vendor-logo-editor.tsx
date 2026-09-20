import {
  BadgeCheck,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Store,
  Upload,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type ImageField =
  | "brand"
  | "logo"
  | "cover";

type Vendor = {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  profile_logo_url: string | null;
  cover_image_url: string | null;
  is_verified: boolean;
};

const IMAGE_RULES: Record<
  ImageField,
  {
    label: string;
    dbField: "logo_url" | "profile_logo_url" | "cover_image_url";
    width: number;
    height: number;
    maxBytes: number;
    description: string;
  }
> = {
  brand: {
    label: "الصورة الرئيسية للعلامة",
    dbField: "logo_url",
    width: 800,
    height: 800,
    maxBytes: 5 * 1024 * 1024,
    description:
      "تظهر في «أبرز التجار» على الصفحة الرئيسية. استخدم صورة مربعة واضحة للعلامة.",
  },
  logo: {
    label: "شعار صفحة التاجر",
    dbField: "profile_logo_url",
    width: 600,
    height: 600,
    maxBytes: 5 * 1024 * 1024,
    description:
      "يظهر داخل بطاقة التاجر وصفحة المتجر. يفضّل أن يكون الشعار في منتصف الصورة مع مساحة آمنة حوله.",
  },
  cover: {
    label: "غلاف صفحة التاجر",
    dbField: "cover_image_url",
    width: 1600,
    height: 700,
    maxBytes: 5 * 1024 * 1024,
    description:
      "يظهر أعلى صفحة المتجر. ضع العناصر المهمة بعيدًا عن الحواف لأن الغلاف يُقصّ على الهواتف.",
  },
};

function readImageSize(file: File): Promise<{
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تعذر قراءة أبعاد الصورة."));
    };

    image.src = url;
  });
}

export function VendorLogoEditor() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<ImageField | null>(null);
  const [activeField, setActiveField] = useState<ImageField>("brand");

  const loadVendor = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle<Vendor>();

      if (error) throw error;

      setVendor(data ?? null);
    } catch (error) {
      console.error("[VendorBranding] load failed:", error);
      toast.error("تعذر تحميل هوية المتجر.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadVendor();
  }, [loadVendor]);

  function chooseImage(field: ImageField) {
    setActiveField(field);
    inputRef.current?.click();
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !vendor || !user?.id) return;

    const rule = IMAGE_RULES[activeField];

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
      ].includes(file.type)
    ) {
      toast.error("الصيغ المسموحة: JPG أو PNG أو WEBP أو AVIF.");
      return;
    }

    if (file.size > rule.maxBytes) {
      toast.error(
        `حجم الصورة يجب ألا يتجاوز ${rule.maxBytes / 1024 / 1024} ميجابايت.`,
      );
      return;
    }

    try {
      const dimensions = await readImageSize(file);

      if (
        dimensions.width !== rule.width ||
        dimensions.height !== rule.height
      ) {
        toast.error(
          `أبعاد الصورة غير صحيحة. المطلوب بالضبط ${rule.width} × ${rule.height} بكسل.`,
        );
        return;
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر التحقق من أبعاد الصورة.",
      );
      return;
    }

    setUploading(activeField);

    try {
      const extension =
        file.type === "image/jpeg"
          ? "jpg"
          : file.type.split("/")[1] || "webp";

      const path =
        `vendors/${user.id}/${activeField}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("vendor-branding")
        .upload(path, file, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("vendor-branding")
        .getPublicUrl(path);

      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await (
        supabase as unknown as {
          rpc: (
            functionName: string,
            args: Record<string, unknown>,
          ) => Promise<{
            data: unknown;
            error: { message: string } | null;
          }>;
        }
      ).rpc("update_vendor_branding", {
        p_vendor_id: vendor.id,
        p_field: rule.dbField,
        p_url: publicUrl,
      });

      if (updateError) throw updateError;

      setVendor((current) =>
        current
          ? {
              ...current,
              [rule.dbField]: publicUrl,
            }
          : current,
      );

      toast.success(`تم تحديث ${rule.label} بنجاح.`);
    } catch (error) {
      console.error("[VendorBranding] upload failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : `تعذر رفع ${rule.label}.`,
      );
    } finally {
      setUploading(null);
    }
  }

  if (loading) {
    return (
      <section
        dir="rtl"
        className="rounded-[2rem] border border-border bg-card p-5"
      >
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          جارٍ تحميل هوية المتجر...
        </div>
      </section>
    );
  }

  if (!vendor) return null;

  const fields: Array<{
    key: ImageField;
    image: string | null;
  }> = [
    { key: "brand", image: vendor.logo_url },
    { key: "logo", image: vendor.profile_logo_url },
    { key: "cover", image: vendor.cover_image_url },
  ];

  return (
    <section
      dir="rtl"
      className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm"
    >
      <div className="border-b border-border bg-gradient-to-l from-[#0E4D64]/[0.07] via-transparent to-[#D65A31]/[0.06] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-foreground">
                هوية صفحة المتجر
              </h2>

              {vendor.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#168BFF]/10 px-2.5 py-1 text-[10px] font-black text-[#168BFF]">
                  <BadgeCheck className="h-3.5 w-3.5 fill-[#168BFF] text-white" />
                  موثّق
                </span>
              ) : null}
            </div>

            <h3 className="mt-1.5 text-lg font-black text-[#0E4D64] dark:text-white">
              {vendor.name}
            </h3>

            <p className="mt-1.5 max-w-2xl text-xs leading-6 text-muted-foreground">
              ارفع الصور الثلاث ليظهر متجرك بصورة احترافية في «أبرز التجار»
              وصفحة التاجر. الصور عامة لأنها أصول المتجر التي يشاهدها العملاء.
            </p>
          </div>

          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0E4D64]/10 text-[#0E4D64] dark:text-[#D65A31]">
            <Store className="h-6 w-6" />
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />

      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        {fields.map(({ key, image }) => {
          const rule = IMAGE_RULES[key];
          const isUploading = uploading === key;

          return (
            <article
              key={key}
              className="overflow-hidden rounded-[1.5rem] border border-border bg-background"
            >
              <div
                className={`relative overflow-hidden bg-secondary ${
                  key === "cover"
                    ? "aspect-[16/7]"
                    : "aspect-square"
                }`}
              >
                {image ? (
                  <img
                    src={image}
                    alt={rule.label}
                    className={
                      key === "cover"
                        ? "h-full w-full object-cover"
                        : "h-full w-full object-contain p-5"
                    }
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="grid h-full min-h-32 place-items-center text-muted-foreground">
                    {key === "cover" ? (
                      <div className="text-center">
                        <ImagePlus className="mx-auto h-9 w-9" />
                        <p className="mt-2 text-[10px]">
                          غلاف المتجر
                        </p>
                      </div>
                    ) : (
                      <Store className="h-12 w-12" />
                    )}
                  </div>
                )}

                <span className="absolute start-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[9px] font-black text-white backdrop-blur">
                  {key === "brand"
                    ? "أبرز التجار"
                    : key === "logo"
                      ? "صفحة التاجر"
                      : "غلاف الصفحة"}
                </span>
              </div>

              <div className="p-4">
                <h4 className="text-sm font-black text-foreground">
                  {rule.label}
                </h4>

                <p className="mt-1.5 text-[10px] leading-5 text-muted-foreground">
                  {rule.description}
                </p>

                <div className="mt-3 rounded-xl border border-[#0E4D64]/10 bg-[#0E4D64]/[0.035] p-3 text-[10px] leading-5 text-[#0E4D64] dark:text-[#DDECF0]">
                  <strong>المطلوب:</strong>{" "}
                  {rule.width} × {rule.height} بكسل
                  <br />
                  <strong>الحد الأقصى:</strong> 5 ميجابايت
                  <br />
                  <strong>الصيغ:</strong> JPG / PNG / WEBP / AVIF
                </div>

                <button
                  type="button"
                  onClick={() => chooseImage(key)}
                  disabled={uploading !== null}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0E4D64] px-4 text-xs font-black text-white transition hover:bg-[#0A3D50] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جارٍ الرفع...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {image ? "تغيير الصورة" : "رفع الصورة"}
                    </>
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="border-t border-border bg-muted/30 px-5 py-4">
        <p className="flex items-start gap-2 text-[10px] leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0E4D64]" />
          سيتم رفض الصورة تلقائيًا إذا لم تطابق الأبعاد المحددة. هذا يمنع
          تشوه الصور أو قصها بشكل غير مناسب على شاشات الهاتف.
        </p>
      </div>
    </section>
  );
}

export default VendorLogoEditor;
