import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchSettings, type Banner4to1 } from "@/lib/store";

export function Banners4to1Manager() {
  const { toast } = useToast();
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
      // جلب أول سجل في جدول site_settings أو تحديثه
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
      toast({ title: "تم حفظ بنرات العروض (4:1) بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ أثناء الحفظ", description: err.message, variant: "destructive" });
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
    return <div className="p-8 text-center text-muted-foreground">جاري تحميل البنرات...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">إدارة شرائح العروض والاعلانات (بنسبة 4:1)</h3>
          <p className="text-sm text-muted-foreground">التحكم بالصور والروابط التي تظهر في الواجهة الرئيسية بين قسم العروض والأكثر مبيعاً.</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ التغييرات
        </Button>
      </div>

      <div className="space-y-4">
        {banners.map((banner, index) => (
          <div key={index} className="rounded-xl border p-4 bg-card space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">الشريحة #{index + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
                className="text-destructive hover:bg-destructive/10 h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                placeholder="عنوان الشريحة (اختياري)"
                value={banner.title || ""}
                onChange={(e) => handleChange(index, "title", e.target.value)}
              />
              <Input
                placeholder="رابط الصورة (Image URL)"
                value={banner.image}
                onChange={(e) => handleChange(index, "image", e.target.value)}
              />
              <Input
                placeholder="رابط الوجهة عند النقر (مثال: /products)"
                value={banner.link || ""}
                onChange={(e) => handleChange(index, "link", e.target.value)}
              />
            </div>

            {banner.image && (
              <div className="mt-2 overflow-hidden rounded-lg border aspect-[4/1] max-h-32 bg-secondary/20">
                <img src={banner.image} alt="معاينة البنر" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        ))}

        <Button type="button" variant="outline" onClick={handleAdd} className="w-full gap-2 border-dashed">
          <Plus className="h-4 w-4" />
          إضافة شريحة بنر جديدة
        </Button>
      </div>
    </div>
  );
}

export default Banners4to1Manager;
