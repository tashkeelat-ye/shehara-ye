import { useEffect, useState, useRef } from "react";
import { Megaphone, Sparkles, Truck, Tag } from "lucide-react";
import { fetchSettings, type SiteSettings } from "@/lib/store";

export function AnnouncementBar() {
  const [s, setS] = useState<SiteSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => setS(await fetchSettings()))();
  }, []);

  // حركة شريط إخباري سلسة ودائمة باستخدام JavaScript لضمان عدم توقفها نهائياً
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationFrameId: number;
    let scrollPos = 0;
    const speed = 0.8; // سرعة الحركة (يمكنك زيادتها أو تقليلها)

    const step = () => {
      scrollPos += speed;
      // إذا تجاوزنا منتصف المسافة (نصف المحتوى المكرر)، نعيد البداية بسلاسة تامة
      if (scrollPos >= scrollContainer.scrollWidth / 2) {
        scrollPos = 0;
      }
      scrollContainer.style.transform = `translateX(${scrollPos}px)`;
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [s]);

  if (!s) return null;

  if (!s.is_open) {
    return (
      <div className="bg-destructive px-4 py-2 text-center text-[11px] font-medium text-destructive-foreground">
        {s.closed_message || "المتجر مغلق مؤقتًا."}
      </div>
    );
  }

  const mainAnnouncement = s.announcement_text || "المتجر مفتوح لاستقبال الطلبات من 8 صباحاً حتى 12 مساءً.";

  const baseAnnouncements = [
    { text: mainAnnouncement, icon: Megaphone },
    { text: "توصيل سريع لكافة المحافظات 🚚", icon: Truck },
    { text: "خصومات مميزة على الفئات المختارة 🔥", icon: Tag },
    { text: "أهلاً بكم في تشكيلات - تسوق ممتع ✨", icon: Sparkles },
  ];

  // تكرار العناصر عدة مرات لملء الفراغات وضمان استمرار الحلقة
  const announcements = [...baseAnnouncements, ...baseAnnouncements, ...baseAnnouncements, ...baseAnnouncements];

  const renderContent = () => (
    <div ref={containerRef} className="overflow-hidden w-full relative flex whitespace-nowrap">
      <div ref={scrollRef} className="flex items-center py-0.5" style={{ willChange: "transform" }}>
        {announcements.map((item, idx) => {
          const IconComponent = item.icon;
          return (
            <div key={idx} className="flex items-center gap-2 px-6 shrink-0">
              <IconComponent className="h-3.5 w-3.5 text-amber-300 shrink-0" />
              <span>{item.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="relative w-full overflow-hidden bg-primary text-primary-foreground py-2 text-xs font-medium border-b border-white/10 z-50" dir="ltr">
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
