import { useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, RefreshCw, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  userId: string;
  onUploaded: (publicUrl: string) => void;
  value?: string;
  disabled?: boolean;
};

const MAX_BYTES = 120 * 1024;
const TARGET = 250;

async function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تعذر قراءة الصورة. جرّب ملف صورة آخر."));
    };
    img.src = url;
  });
}

async function processImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("يرجى اختيار ملف صورة.");
  }

  const img = await fileToImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = TARGET;
  canvas.height = TARGET;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("المتصفح لا يدعم معالجة الصور.");

  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.clearRect(0, 0, TARGET, TARGET);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET, TARGET);

  // WebP quality is reduced progressively to meet the requested size.
  for (let quality = 0.92; quality >= 0.35; quality -= 0.08) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (blob && blob.size < MAX_BYTES) return blob;
  }

  // Keep the exact dimensions even if a very complex image cannot reach the target size.
  const fallback = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.25),
  );
  if (!fallback) throw new Error("تعذر تجهيز الصورة.");
  if (fallback.size >= MAX_BYTES) {
    throw new Error("تعذر ضغط هذه الصورة إلى أقل من 120KB. جرّب صورة أبسط.");
  }
  return fallback;
}

export function VendorLogoCropper({ userId, onUploaded, value, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState("");

  useEffect(() => setPreview(value ?? ""), [value]);

  async function handleFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await processImage(file);
      const random = Math.random().toString(36).slice(2, 10);
      // The existing bucket policy requires vendors/{auth.uid()}/... paths.
      const path = `vendors/${userId}/logos/${Date.now()}-${random}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("vendor-branding")
        .upload(path, blob, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("vendor-branding").getPublicUrl(path);
      setPreview(data.publicUrl);
      setDetails(`${TARGET}×${TARGET} بكسل · ${(blob.size / 1024).toFixed(1)}KB`);
      onUploaded(data.publicUrl);
      toast.success("تم تجهيز شعار المتجر ورفعه بنجاح.");
    } catch (error) {
      console.error("[VendorLogoCropper]", error);
      toast.error(error instanceof Error ? error.message : "تعذر رفع الشعار.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-2xl border border-dashed border-[#0E4D64]/30 bg-[#0E4D64]/[0.035] p-4 sm:p-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#0E4D64]/15 bg-white shadow-sm">
            {preview ? (
              <img src={preview} alt="معاينة شعار المتجر" className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#0E4D64]/65">
                <ImagePlus className="h-8 w-8" />
                <span className="text-xs font-bold">معاينة الشعار</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-right">
            <p className="font-bold text-[#0E4D64]">شعار متجرك</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              ارفع صورة بأي أبعاد؛ سنقصّها مركزيًا إلى مربع ونضغطها تلقائيًا قبل الرفع.
            </p>
            <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-6 text-[#0E4D64] ring-1 ring-[#0E4D64]/10">
              المقاس المعتمد: 250×250 بكسل
              <br />
              الحجم المقترح: أقل من 120KB · WebP
            </div>
            {details && <p className="mt-2 text-xs text-emerald-700">{details}</p>}
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button type="button" disabled={disabled || busy} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-[#0E4D64] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#093b4e] disabled:opacity-60">
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : preview ? <RefreshCw className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
                {busy ? "جارٍ تجهيز الشعار..." : preview ? "تغيير الشعار" : "اختيار صورة"}
              </button>
              {preview && <button type="button" disabled={busy} onClick={() => { setPreview(""); setDetails(""); onUploaded(""); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600">إزالة</button>}
            </div>
          </div>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" disabled={disabled || busy} onChange={(event) => void handleFile(event.target.files?.[0])} />
    </div>
  );
}
