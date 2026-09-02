import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  Eye, 
  EyeOff,
  Home,
  LayoutGrid,
  ShoppingCart,
  User,
  Heart,
  Search,
  Tag,
  Package
} from "lucide-react";
import { toast } from "sonner";

// قائمة الأيقونات المتاحة للاختيار
const AVAILABLE_ICONS: Record<string, any> = {
  Home,
  LayoutGrid,
  ShoppingCart,
  User,
  Heart,
  Search,
  Tag,
  Package,
};

export interface BottomNavItem {
  id: string;
  title: string;
  path: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
  is_cart_badge: boolean;
}

export default function AdminBottomNavManager() {
  const [items, setItems] = useState<BottomNavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // جلب العناصر
  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bottom_nav_items")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("حدث خطأ أثناء جلب عناصر القائمة");
    } else if (data) {
      setItems(data as BottomNavItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchItems();
  }, []);

  // تحديث عنصر محلياً
  const updateLocalItem = (id: string, field: keyof BottomNavItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // إضافة عنصر جديد
  const handleAddNew = () => {
    const newItem: BottomNavItem = {
      id: `temp-${Date.now()}`,
      title: "عنصر جديد",
      path: "/",
      icon_name: "Home",
      sort_order: items.length + 1,
      is_active: true,
      is_cart_badge: false,
    };
    setItems([...items, newItem]);
  };

  // حذف عنصر
  const handleDelete = async (id: string) => {
    if (id.startsWith("temp-")) {
      setItems(items.filter((i) => i.id !== id));
      return;
    }

    if (!confirm("هل أنت تأكد من حذف هذا العنصر؟")) return;

    const { error } = await supabase.from("bottom_nav_items").delete().eq("id", id);
    if (error) {
      toast.error("تعذر الحذف: " + error.message);
    } else {
      toast.success("تم الحذف بنجاح");
      setItems(items.filter((i) => i.id !== id));
    }
  };

  // حفظ كافة التغييرات والترتيب
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (let index = 0; index < items.length; index++) {
        const item = items[index]!;
        const payload = {
          title: item.title,
          path: item.path,
          icon_name: item.icon_name,
          sort_order: index + 1,
          is_active: item.is_active,
          is_cart_badge: item.is_cart_badge,
        };

        if (item.id.startsWith("temp-")) {
          await supabase.from("bottom_nav_items").insert([payload]);
        } else {
          await supabase.from("bottom_nav_items").update(payload).eq("id", item.id);
        }
      }
      toast.success("تم حفظ التعديلات والترتيب بنجاح!");
      await fetchItems();
    } catch (e) {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  // تحريك العنصر للأعلى أو الأسفل
  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index]!;
    newItems[index] = newItems[targetIndex]!;
    newItems[targetIndex] = temp;

    setItems(newItems);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 dir-rtl">
      {/* الهيدر */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">إدارة شريط التنقل السفلي</h1>
          <p className="text-xs text-muted-foreground mt-1">
            التحكم في الأزرار والترتيب والتفعيل للشريط السفلي بالمتجر
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddNew}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-foreground text-xs font-bold hover:bg-secondary/80 transition-all"
          >
            <Plus className="h-4 w-4" /> عنصر جديد
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ التغييرات
          </button>
        </div>
      </div>

      {/* قائمة العناصر */}
      <div className="space-y-3">
        {items.map((item, index) => {
          const IconComponent = AVAILABLE_ICONS[item.icon_name] || Home;

          return (
            <div
              key={item.id}
              className={`flex flex-col md:flex-row items-center gap-3 p-4 rounded-2xl border transition-all ${
                item.is_active ? "bg-card border-border" : "bg-muted/40 border-border/50 opacity-70"
              }`}
            >
              {/* أزرار إعادة الترتيب */}
              <div className="flex md:flex-col items-center gap-1 text-muted-foreground">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveItem(index, "up")}
                  className="p-1 hover:text-primary disabled:opacity-30"
                >
                  ▲
                </button>
                <GripVertical className="h-4 w-4 text-muted-foreground/40 hidden md:block" />
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(index, "down")}
                  className="p-1 hover:text-primary disabled:opacity-30"
                >
                  ▼
                </button>
              </div>

              {/* معاينة الأيقونة */}
              <div className="p-3 rounded-xl bg-secondary/60 text-primary shrink-0">
                <IconComponent className="h-5 w-5" />
              </div>

              {/* المدخلات */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                {/* العنوان */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground">اسم العنصر:</label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => updateLocalItem(item.id, "title", e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border bg-background text-foreground focus:outline-none"
                  />
                </div>

                {/* المسار */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground">المسار (Path):</label>
                  <input
                    type="text"
                    value={item.path}
                    onChange={(e) => updateLocalItem(item.id, "path", e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border bg-background text-foreground focus:outline-none ltr"
                  />
                </div>

                {/* اختيار الأيقونة */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground">الأيقونة:</label>
                  <select
                    value={item.icon_name}
                    onChange={(e) => updateLocalItem(item.id, "icon_name", e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border bg-background text-foreground focus:outline-none"
                  >
                    {Object.keys(AVAILABLE_ICONS).map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* خيارات التفعيل والسلة والحذف */}
              <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0">
                {/* زر التفعيل/التعطيل */}
                <button
                  type="button"
                  onClick={() => updateLocalItem(item.id, "is_active", !item.is_active)}
                  className={`p-2 rounded-xl border transition-colors ${
                    item.is_active
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                  }`}
                  title={item.is_active ? "مفعل" : "معطل"}
                >
                  {item.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>

                {/* خيار شارة السلة */}
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={item.is_cart_badge}
                    onChange={(e) => updateLocalItem(item.id, "is_cart_badge", e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>شارة السلة</span>
                </label>

                {/* زر الحذف */}
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id)}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
      }
    
