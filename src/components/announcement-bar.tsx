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

import {
  BRAND_COLORS,
} from "@/lib/logo";

/**
 * =========================================================
 * شهارة للتسوق
 * Announcement Bar
 * =========================================================
 *
 * الشريط العلوي الرسمي للإعلانات.
 *
 * الهوية:
 *
 * - العنابي: اللون الأساسي.
 * - الذهبي: لون الإبراز.
 * - زخرفة هندسية يمنية بسيطة.
 * - خلفية فاخرة بدون صور إضافية.
 *
 * الحركة:
 *
 * - CSS based.
 * - لا تعتمد على requestAnimationFrame.
 * - متوافقة مع RTL.
 * - متوافقة مع prefers-reduced-motion.
 * - تتوقف عند hover.
 * - تتوقف عند focus.
 * =========================================================
 */

type AnnouncementItem = {
  text: string;
  icon: typeof Megaphone;
};

/**
 * =========================================================
 * زخرفة صغيرة مستوحاة من الهوية
 * =========================================================
 */

function HeritageMark() {
  return (
    <span
      aria-hidden="true"
      className="
        relative
        inline-flex
        h-5
        w-5
        shrink-0
        items-center
        justify-center
      "
    >
      <span
        className="
          absolute
          h-3
          w-3
          rotate-45
          border
          border-[#E0B85C]/70
        "
      />

      <span
        className="
          absolute
          h-1.5
          w-1.5
          rotate-45
          border
          border-[#F2D58B]/90
        "
      />
    </span>
  );
}

/**
 * =========================================================
 * عنصر الإعلان
 * =========================================================
 */

function AnnouncementContent({
  item,
}: {
  item: AnnouncementItem;
}) {
  const IconComponent = item.icon;

  return (
    <div
      className="
        flex
        shrink-0
        items-center
        gap-2.5
        px-5
        py-0.5
        text-[11px]
        font-semibold
        leading-5
        text-white
        sm:px-7
        sm:text-xs
      "
    >
      <HeritageMark />

      <IconComponent
        className="
          h-3.5
          w-3.5
          shrink-0
          text-[#E0B85C]
        "
        strokeWidth={2.15}
        aria-hidden="true"
      />

      <span>
        {item.text}
      </span>
    </div>
  );
}

/**
 * =========================================================
 * المكون الرئيسي
 * =========================================================
 */

export function AnnouncementBar() {
  const [
    settings,
    setSettings,
  ] = useState<SiteSettings | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
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

  /**
   * =======================================================
   * بناء قائمة الإعلانات
   * =======================================================
   */

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
              text: "أهلاً بكم في شهارة - تسوق ممتع ✨",
              icon: Sparkles,
            },
          ];

        /*
         * نستخدم مجموعتين متطابقتين.
         *
         * السبب:
         * CSS يحرك المجموعة الأولى حتى موضع المجموعة
         * الثانية، ثم يعيد الحركة دون ظهور قفزة.
         */

        return [
          ...baseAnnouncements,
          ...baseAnnouncements,
        ];
      },
      [settings],
    );

  /**
   * لا نعرض الشريط قبل اكتمال تحميل الإعدادات.
   */

  if (!settings) {
    return null;
  }

  /**
   * =======================================================
   * حالة إغلاق المتجر
   * =======================================================
   */

  if (!settings.is_open) {
    return (
      <div
        className="
          relative
          z-50
          w-full
          overflow-hidden
          border-b
          border-[#E0B85C]/30
          bg-[#4A1525]
          text-white
          shadow-[0_2px_12px_-8px_rgba(74,21,37,0.7)]
        "
        style={{
          backgroundImage: `
            radial-gradient(
              circle at 12% 50%,
              rgba(224,184,92,0.08),
              transparent 24%
            ),
            radial-gradient(
              circle at 88% 50%,
              rgba(224,184,92,0.06),
              transparent 24%
            )
          `,
        }}
        dir="rtl"
        role="status"
        aria-live="polite"
      >
        <div
          className="
            mx-auto
            flex
            min-h-10
            w-full
            max-w-7xl
            items-center
            justify-center
            gap-2
            px-4
            py-2
            text-center
            text-xs
            font-bold
          "
        >
          <HeritageMark />

          <span>
            {settings.closed_message ||
              "المتجر مغلق مؤقتًا."}
          </span>

          <HeritageMark />
        </div>
      </div>
    );
  }

  /**
   * =======================================================
   * إنشاء مجموعة إعلانات
   * =======================================================
   */

  const renderAnnouncementSet = (
    setIndex: number,
  ) => {
    const half =
      announcements.length / 2;

    const items =
      announcements.slice(
        setIndex === 0
          ? 0
          : half,
        setIndex === 0
          ? half
          : announcements.length,
      );

    return (
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
        {items.map(
          (
            item,
            index,
          ) => (
            <AnnouncementContent
              key={`${setIndex}-${index}`}
              item={item}
            />
          ),
        )}
      </div>
    );
  };

  /**
   * =======================================================
   * محتوى Marquee
   * =======================================================
   */

  const marqueeContent = (
    <div
      className="
        relative
        w-full
        overflow-hidden
      "
      dir="rtl"
    >
      {/*
       * زخرفة جانبية يسار.
       */}

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-3
          top-1/2
          z-10
          hidden
          -translate-y-1/2
          opacity-50
          sm:block
        "
      >
        <HeritageMark />
      </span>

      {/*
       * زخرفة جانبية يمين.
       */}

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          right-3
          top-1/2
          z-10
          hidden
          -translate-y-1/2
          opacity-50
          sm:block
        "
      >
        <HeritageMark />
      </span>

      <div
        className="
          shehara-marquee
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

  /**
   * =======================================================
   * رابط الإعلان الاختياري
   * =======================================================
   */

  const content =
    settings.announcement_link ? (
      <a
        href={
          settings.announcement_link
        }
        className="
          block
          w-full
          transition-opacity
          duration-200
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

  /**
   * =======================================================
   * الشريط النهائي
   * =======================================================
   */

  return (
    <div
      className="
        relative
        z-50
        w-full
        overflow-hidden
        border-b
        border-[#E0B85C]/25
        bg-[#4A1525]
        py-1.5
        text-white
        shadow-[0_3px_16px_-10px_rgba(74,21,37,0.75)]
        dark:border-[#E0B85C]/20
        dark:bg-[#35101C]
      "
      style={{
        backgroundImage: `
          linear-gradient(
            90deg,
            rgba(53,16,28,0.98),
            rgba(74,21,37,1),
            rgba(53,16,28,0.98)
          ),
          radial-gradient(
            circle at 50% 0%,
            rgba(224,184,92,0.08),
            transparent 48%
          )
        `,
        color: BRAND_COLORS.cream,
      }}
      dir="rtl"
      role="region"
      aria-label="الإعلانات"
    >
      {/*
       * الخط الذهبي العلوي.
       */}

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-[#E0B85C]/60
          to-transparent
        "
      />

      {/*
       * زخرفة هندسية خفية في المنتصف.
       */}

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-1/2
          h-16
          w-16
          -translate-x-1/2
          -translate-y-1/2
          rotate-45
          rounded-[0.5rem]
          border
          border-[#E0B85C]/[0.035]
        "
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-1/2
          h-10
          w-10
          -translate-x-1/2
          -translate-y-1/2
          rotate-45
          rounded-[0.35rem]
          border
          border-[#E0B85C]/[0.035]
        "
      />

      {content}

      {/*
       * الخط الذهبي السفلي.
       */}

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-0
          bottom-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-[#E0B85C]/30
          to-transparent
        "
      />
    </div>
  );
}

export default AnnouncementBar;
