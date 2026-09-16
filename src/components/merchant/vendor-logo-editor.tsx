import {
  ImagePlus,
  Loader2,
  Store,
  Upload,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadMedia } from "@/lib/media";

type Vendor = {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
};

export function VendorLogoEditor() {
  const { user } = useAuth();

  const inputRef =
    useRef<HTMLInputElement | null>(null);

  const [vendor, setVendor] =
    useState<Vendor | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [imageError, setImageError] =
    useState(false);

  const loadVendor = useCallback(
    async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const {
          data,
          error,
        } = await supabase
          .from("vendors")
          .select(
            "id,user_id,name,logo_url",
          )
          .eq(
            "user_id",
            user.id,
          )
          .maybeSingle<Vendor>();

        if (error) {
          throw error;
        }

        setVendor(data ?? null);
        setImageError(false);
      } catch (error) {
        console.error(
          "[VendorLogoEditor] load failed:",
          error,
        );

        toast.error(
          "تعذر تحميل بيانات شعار المتجر.",
        );
      } finally {
        setLoading(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    void loadVendor();
  }, [loadVendor]);

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (!user?.id || !vendor) {
      toast.error(
        "تعذر تحديد حساب التاجر.",
      );
      return;
    }

    if (
      !file.type.startsWith("image/")
    ) {
      toast.error(
        "يرجى اختيار ملف صورة فقط.",
      );
      return;
    }

    if (
      file.size >
      8 * 1024 * 1024
    ) {
      toast.error(
        "حجم الشعار يجب ألا يتجاوز 8 ميجابايت.",
      );
      return;
    }

    setUploading(true);

    try {
      const logoUrl =
        await uploadMedia(
          "products",
          file,
          `vendors/${user.id}/branding`,
        );

      const {
        error,
      } = await supabase
        .from("vendors")
        .update({
          logo_url: logoUrl,
        })
        .eq(
          "id",
          vendor.id,
        )
        .eq(
          "user_id",
          user.id,
        );

      if (error) {
        throw error;
      }

      setVendor(
        (current) =>
          current
            ? {
                ...current,
                logo_url:
                  logoUrl,
              }
            : current,
      );

      setImageError(false);

      toast.success(
        "تم تحديث شعار المتجر بنجاح.",
      );
    } catch (error) {
      console.error(
        "[VendorLogoEditor] upload failed:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر رفع شعار المتجر.",
      );
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <section
        dir="rtl"
        className="rounded-3xl border border-border bg-card p-5"
      >
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          جارٍ تحميل هوية المتجر...
        </div>
      </section>
    );
  }

  if (!vendor) {
    return null;
  }

  const showLogo =
    Boolean(
      vendor.logo_url &&
        !imageError,
    );

  return (
    <section
      dir="rtl"
      className="overflow-hidden rounded-3xl border border-border bg-card"
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-3xl border border-border bg-secondary shadow-sm">
              {showLogo ? (
                <img
                  src={vendor.logo_url ?? ""}
                  alt={`شعار ${vendor.name}`}
                  className="h-full w-full object-contain p-2"
                  onError={() =>
                    setImageError(true)
                  }
                />
              ) : (
                <Store className="h-12 w-12 text-primary" />
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                inputRef.current?.click()
              }
              disabled={uploading}
              aria-label="رفع شعار المتجر"
              className="absolute -bottom-2 -left-2 grid h-10 w-10 place-items-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-md disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
            </button>

            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="hidden"
              onChange={
                handleFileChange
              }
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-foreground">
                هوية المتجر
              </h2>

              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                شعار المتجر
              </span>
            </div>

            <h3 className="mt-2 truncate text-lg font-bold text-foreground">
              {vendor.name}
            </h3>

            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              ارفع شعار متجرك ليظهر للعملاء في
              «أبرز التجار» وصفحة متجرك داخل شهارة.
            </p>

            <button
              type="button"
              onClick={() =>
                inputRef.current?.click()
              }
              disabled={uploading}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-2xl bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ رفع الشعار...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {vendor.logo_url
                    ? "تغيير الشعار"
                    : "رفع شعار المتجر"}
                </>
              )}
            </button>

            <p className="mt-2 text-[10px] text-muted-foreground">
              PNG أو JPG أو WEBP أو AVIF — حتى 8 ميجابايت.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
