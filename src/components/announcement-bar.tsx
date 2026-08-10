import { useEffect, useState } from "react";
import { Megaphone, Sparkles, Truck, Tag } from "lucide-react";
import { fetchSettings, type SiteSettings } from "@/lib/store";

/** شريط إعلانات وحالة المتجر — متحرك ويُدار بالكامل من لوحة التحكم. */
export function AnnouncementBar() {
  const [s, setS] = useState<SiteSettings | null>(null);

  useEffect(() => {
    void (async () => setS(await fetchSettings()))();
  }, []);

  if (!s) return null;

  // إذا كان المتجر مغلقاً يظهر شريط التنبيه بكونه مغلقاً
  if (!s.is_open) {
    return (
      <div className="bg-destructive px-4 py-2 text-center text-[11px] font-medium text-destructive-foreground">
        {s.closed_message || "المتجر مغلق مؤقتًا."}
      </div>
    );
  }

  // النص الرئيسي المجلوب من لوحة التحكم (أو نص افتراضي في حال عدم وجوده للاختبار)
  const mainAnnouncement = s.announcement_text || "المتجر مفتوح لاستقبال الطلبات من 8 صباحاً حتى 12 مساءً.";

  // قائمة النصوص الترويجية المضافة للاختبار ولإعطاء مظهر متكامل
  const announcements = [
    { text: mainAnnouncement, icon: Megaphone },
    { text: "توصيل سريع لكافة المحافظات 🚚", icon: Truck },
    { text: "خصومات مميزة على الفئات المختارة 🔥", icon: Tag },
    { text: "أهلاً بكم في تشكيلات - تسوق ممتع ✨", icon: Sparkles },
  ];

  const renderContent = () => (
    <div className="flex whitespace-nowrap animate-marquee items-center">
      {/* تكرار القائمة مرتين لضمان استمرارية الحركة بدون فراغات (Looping) */}
      {[...announcements, ...announcements].map((item, idx) => {
        const IconComponent = item.icon;
        return (
          <div key={idx} className="flex items-center gap-2 px-6">
            <IconComponent className="h-3.5 w-3.5 text-amber-300 shrink-0" />
            <span>{item.text}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="relative w-full overflow-hidden bg-primary text-primary-foreground py-2 text-xs font-medium border-b border-white/10 z-50">
      {s.announcement_link ? (
        <a href={s.announcement_link} className="block hover:underline">
          {renderContent()}
        </a>
      ) : (
        renderContent()
      )}
    </div>
  );
}

export default AnnouncementBar;
    
