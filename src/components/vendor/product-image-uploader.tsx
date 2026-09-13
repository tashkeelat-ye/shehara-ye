import {
  useRef,
  useState,
} from "react";

import {
  ImagePlus,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import { toast } from "sonner";

import {
  supabase,
} from "@/integrations/supabase/client";

type ProductImageUploaderProps = {
  userId: string;
  value: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
};

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function ProductImageUploader({
  userId,
  value,
  onChange,
  maxImages = 12,
}: ProductImageUploaderProps) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [uploading, setUploading] =
    useState(false);

  async function uploadFiles(
    files: FileList | null,
  ) {
    if (!files || files.length === 0) {
      return;
    }

    const remaining =
      maxImages - value.length;

    if (remaining <= 0) {
      toast.error(
        `الحد الأقصى ${maxImages} صورة`,
      );
      return;
    }

    const selected =
      Array.from(files).slice(
        0,
        remaining,
      );

    setUploading(true);

    const uploaded: string[] = [];

    try {
      for (const file of selected) {
        if (
          !ACCEPTED_TYPES.includes(
            file.type,
          )
        ) {
          toast.error(
            `نوع الملف غير مدعوم: ${file.name}`,
          );
          continue;
        }

        if (
          file.size >
          MAX_FILE_SIZE
        ) {
          toast.error(
            `حجم الصورة يجب ألا يتجاوز 5MB: ${file.name}`,
          );
          continue;
        }

        const extension =
          file.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
          "jpg";

        const fileName =
          `${crypto.randomUUID()}.${extension}`;

        const path =
          `vendors/${userId}/products/${fileName}`;

        const {
          error,
        } = await supabase.storage
          .from("products")
          .upload(
            path,
            file,
            {
              cacheControl: "31536000",
              upsert: false,
              contentType:
                file.type,
            },
          );

        if (error) {
          throw error;
        }

        const {
          data,
        } =
          supabase.storage
            .from("products")
            .getPublicUrl(path);

        if (!data.publicUrl) {
          throw new Error(
            "تعذر إنشاء رابط الصورة",
          );
        }

        uploaded.push(
          data.publicUrl,
        );
      }

      if (uploaded.length > 0) {
        onChange([
          ...value,
          ...uploaded,
        ]);

        toast.success(
          `تم رفع ${uploaded.length} صورة بنجاح`,
        );
      }
    } catch (error) {
      console.error(
        "[ProductImageUploader]",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر رفع الصور",
      );
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value =
          "";
      }
    }
  }

  function removeImage(
    image: string,
  ) {
    onChange(
      value.filter(
        (item) =>
          item !== image,
      ),
    );
  }

  return (
    <div
      dir="rtl"
      className="space-y-3"
    >
      {value.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map(
            (
              image,
              index,
            ) => (
              <div
                key={`${image}-${index}`}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary"
              >
                <img
                  src={image}
                  alt={`صورة المنتج ${index + 1}`}
                  className="h-full w-full object-cover"
                />

                {index === 0 ? (
                  <span className="absolute bottom-1 start-1 rounded-full bg-black/65 px-2 py-1 text-[9px] text-white">
                    الصورة الرئيسية
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    removeImage(
                      image,
                    )
                  }
                  className="absolute end-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground"
                  aria-label="حذف الصورة"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-7 text-center">
          <ImagePlus className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />

          <p className="text-xs font-semibold">
            لم تتم إضافة صور
          </p>

          <p className="mt-1 text-[10px] text-muted-foreground">
            يمكنك اختيار صور مباشرة من جهازك
          </p>
        </div>
      )}

      <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 text-xs font-bold text-primary transition hover:bg-primary/10">
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}

        <span>
          {uploading
            ? "جارٍ رفع الصور..."
            : "اختيار صور من الجهاز"}
        </span>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={
            uploading ||
            value.length >=
              maxImages
          }
          className="hidden"
          onChange={(event) =>
            void uploadFiles(
              event.target.files,
            )
          }
        />
      </label>

      <p className="text-[9px] text-muted-foreground">
        JPG / PNG / WEBP — الحد الأقصى 5MB للصورة
        — حتى {maxImages} صور.
      </p>
    </div>
  );
}
