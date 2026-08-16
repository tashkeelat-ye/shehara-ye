import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { fetchSettings, type Banner4to1 } from "@/lib/store";
import { AdminCard, Field, btnCls, btnGhostCls, inputCls } from "@/components/admin-ui";

export function Banners4to1Manager() {
  const queryClient = useQueryClient();
  const [banners, setBanners] = useState<Banner4to1[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const settings = await fetchSettings();
      if (settings?.custom_banners_4to1) {
        setBanners(settings.custom_banners_4to1);
      }
      setLoading(false);
    })();
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase.from("site_settings").select("id").maybeSingle();
      
      let error;
      if (existing) {
        const res = await supabase
          .from("site_settings")
          .update({ custom_banners_4to1: banners })
          .eq("id", existing.id);
        error = res.error;
      } else {
        const res = await supabase
          .from("site_settings")
          .insert([{ custom_banners_4to1: banners }]);
        error = res.error;
      }

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("تم حفظ بنرات العروض (4:1) بنجاح");
    },
    onError: (err: any) => {
      toast.error("خطأ أثناء الحفظ: " + err.message);
    },
  });

  const handleAdd = () => {
    setBanners([...banners, { image: "", link: "", title: "" }]);
  };

  const handleRemove = (index: number) => {
    setBanners(banners.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof Banner4to1, value: string) => {
    const updated = [...banners];
    updated[index] = { ...updated[index], [field]: value };
    setBanners(updated);
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground">جاري تحميل البنرات...</div>;
  }

  return (
    <AdminCard
      title="إدارة شرائح العروض والإعلانات (بنسبة 4:1)"
      action={
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className={btnCls}
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ التغييرات
        </button>
      }
    >
      <p className="text-xs text-muted-foreground mb-4">
        التحكم بالصور والروابط التي تظهر في الواجهة الرئيسية بين قسم العروض والأكثر مبيعاً.
      </p>

      <div className="space-y-4">
        {banners.map((banner, index) => (
          <div key={index} className="rounded-xl border border-border p-3 bg-secondary/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">الشريحة #{index + 1}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="inline-flex h-8 items-center rounded-lg border border-destructive/40 px-2.5 text-xs text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="عنوان الشريحة (اختياري)">
                <input
                  className={inputCls}
                  placeholder="العنوان"
                  value={banner.title || ""}
                  onChange={(e) => handleChange(index, "title", e.target.value)}
                />
              </Field>
              <Field label="رابط الصورة (Image URL)">
                <input
                  dir="ltr"
                  className={inputCls}
                  placeholder="https://..."
                  value={banner.image}
                  onChange={(e) => handleChange(index, "image", e.target.value)}
                />
              </Field>
              <Field label="رابط الوجهة">
                <input
                  dir="ltr"
                  className={inputCls}
                  placeholder="/products"
                  value={banner.link || ""}
                  onChange={(e) => handleChange(index, "link", e.target.value)}
                />
              </Field>
            </div>

            {banner.image && (
              <div className="mt-2 overflow-hidden rounded-lg border border-border aspect-[4/1] max-h-28 bg-muted">
                <img src={banner.image} alt="معاينة البنر" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/50 text-xs font-medium text-foreground hover:bg-secondary"
        >
          <Plus className="h-4 w-4" />
          إضافة شريحة بنر جديدة
        </button>
      </div>
    </AdminCard>
  );
}

export default Banners4to1Manager;
