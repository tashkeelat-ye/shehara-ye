import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Megaphone,
  Sparkles,
  Truck,
  Tag,
} from "lucide-react";
import {
  fetchSettings,
  type SiteSettings,
} from "@/lib/store";

/**
 * =========================================================
 * تشكيلات للتسوق
 * Announcement Bar
 * =========================================================
 *
 * تم إعادة بناء حركة الشريط لتكون:
 *
 * - CSS based بدلاً من requestAnimationFrame.
 * - أكثر استقراراً على الهواتف.
 * - أقل استهلاكاً للمعالج والبطارية.
 * - متوافقة مع RTL.
 * - متوافقة مع prefers-reduced-motion.
 * - قابلة للإيقاف عند مرور المؤشر.
 * - قابلة للإيقاف عند التركيز للوصولية.
 * =========================================================
 */

type AnnouncementItem = {
  text: string;
  icon: typeof Megaphone;
};

export function AnnouncementBar() {
  const [
    settings,
    setSettings,
  ] =
    useState<SiteSettings | null>(
      null,
    );

  useEffect(() => {
    let mounted = true;

    const loadSettings =
      async () => {
        try {
          const result =
            await fetchSettings();

          if (mounted) {
            setSettings(result);
          }
        } catch (error) {
          console.error(
            "Failed to load announcement settings:",
            error,
          );

          if (mounted) {
            setSettings(null);
          }
        }
      };

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const announcements =
    useMemo<AnnouncementItem[]>(
      () => {
        if (!settings) {
          return [];
        }

        const mainAnnouncement =
          settings.announcement_text ||
          "المتجر مفتوح لاستقبال الطلبات من 8 صباحاً حتى 12 مساءً.";

        const baseAnnouncements: AnnouncementItem[] =
          [
            {
              text: mainAnnouncement,
              icon: Megaphone,
            },
            {
              text: "توصيل سريع لكافة المحافظات 🚚",
              icon: Truck,
            },
            {
              text: "خصومات مميزة على الفئات المختارة 🔥",
              icon: Tag,
            },
            {
              text: "أهلاً بكم في تشكيلات - تسوق ممتع ✨",
              icon: Sparkles,
            },
          ];

        /*
         * نحتاج نسختين متطابقتين فقط.
         *
         * CSS يحرك المجموعة الأولى إلى موضع المجموعة
         * الثانية، ثم يعيد الحركة من البداية بدون قفزة.
         */
        return [
          ...baseAnnouncements,
          ...baseAnnouncements,
        ];
      },
      [settings],
    );

  if (!settings) {
    return null;
  }

  /*
   * عندما يكون المتجر مغلقاً، نعرض الرسالة الحالية
   * بدون تشغيل Marquee.
   */
  if (!settings.is_open) {
    return (
      <div
        className="
          relative
          z-50
          w-full
          border-b
          border-[#E0B85C]/20
          bg-[#4A1525]
          px-4
          py-2.5
          text-center
          text-xs
          font-bold
          text-white
        "
        dir="rtl"
        role="status"
      >
        <span>
          {settings.closed_message ||
            "المتجر مغلق مؤقتًا."}
        </span>
      </div>
    );
  }

  /**
   * محتوى النسخة الواحدة.
   *
   * نحافظ على نفس البنية البصرية لكل عنصر.
   */
  const renderAnnouncementSet = (
    setIndex: number,
  ) => (
    <div
      key={setIndex}
      className="
        flex
        shrink-0
        items-center
        whitespace-nowrap
      "
      aria-hidden={
        setIndex !== 0
      }
    >
      {announcements
        .slice(
          setIndex === 0
            ? 0
            : announcements.length / 2,
          setIndex === 0
            ? announcements.length / 2
            : announcements.length,
        )
        .map(
          (
            item,
            index,
          ) => {
            const IconComponent =
              item.icon;

            return (
              <div
                key={`${setIndex}-${index}`}
                className="
                  flex
                  shrink-0
                  items-center
                  gap-2
                  px-6
                  py-0.5
                  text-[11px]
                  font-semibold
                  sm:px-8
                  sm:text-xs
                "
              >
                <IconComponent
                  className="
                    h-3.5
                    w-3.5
                    shrink-0
                    text-[#E0B85C]
                  "
                  strokeWidth={
                    2.2
                  }
                  aria-hidden="true"
                />

                <span>
                  {item.text}
                </span>
              </div>
            );
          },
        )}
    </div>
  );

  const marqueeContent = (
    <div
      className="
        relative
        w-full
        overflow-hidden
      "
      dir="rtl"
    >
      <div
        className="
          tashkilat-marquee
          flex
          w-max
          min-w-max
          items-center
        "
      >
        {renderAnnouncementSet(0)}
        {renderAnnouncementSet(1)}
      </div>
    </div>
  );

  const content = settings.announcement_link ? (
    <a
      href={settings.announcement_link}
      className="
        block
        w-full
        transition-opacity
        hover:opacity-90
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-inset
        focus-visible:ring-[#E0B85C]
      "
      aria-label="فتح الإعلان"
    >
      {marqueeContent}
    </a>
  ) : (
    marqueeContent
  );

  return (
    <div
      className="
        relative
        z-50
        w-full
        overflow-hidden
        border-b
        border-[#E0B85C]/20
        bg-[#4A1525]
        py-2
        text-xs
        font-medium
        text-white
        shadow-sm
      "
      dir="rtl"
      role="region"
      aria-label="الإعلانات"
    >
      {content}
    </div>
  );
}

export default AnnouncementBar;
