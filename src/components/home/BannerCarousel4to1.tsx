import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchSettings,
  type SiteSettings,
} from "@/lib/store";

type RealtimeDetail = {
  table: string;
  eventType?:
    | "INSERT"
    | "UPDATE"
    | "DELETE"
    | "*";
};

export function BannerCarousel4to1() {
  const [
    settings,
    setSettings,
  ] = useState<SiteSettings | null>(null);

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  /**
   * =========================================================
   * تحميل إعدادات الشرائح
   * =========================================================
   */

  async function loadSettings() {
    try {
      const data =
        await fetchSettings();

      setSettings(data);
    } catch (error) {
      console.error(
        "[BannerCarousel4to1] Failed to load settings:",
        error,
      );
    }
  }

  /**
   * =========================================================
   * التحميل الأولي
   * =========================================================
   */

  useEffect(() => {
    void loadSettings();
  }, []);

  /**
   * =========================================================
   * الاستماع للتحديثات اللحظية
   *
   * عند تعديل شرائح 4:1 من لوحة الإدارة:
   * يتم تحديث الصفحة الرئيسية مباشرة.
   * =========================================================
   */

  useEffect(() => {
    const handleRealtime =
      (
        event: Event,
      ) => {
        const customEvent =
          event as CustomEvent<RealtimeDetail>;

        if (
          customEvent.detail?.table !==
          "site_settings"
        ) {
          return;
        }

        setCurrentIndex(0);

        void loadSettings();
      };

    window.addEventListener(
      "shehara:realtime",
      handleRealtime,
    );

    return () => {
      window.removeEventListener(
        "shehara:realtime",
        handleRealtime,
      );
    };
  }, []);

  /**
   * =========================================================
   * الشرائح الافتراضية
   * =========================================================
   */

  const defaultBanners = useMemo(
    () => [
      {
        image:
          "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=300&fit=crop",
        link:
          "/products",
        title:
          "عرض خاص 4:1",
      },
      {
        image:
          "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200&h=300&fit=crop",
        link:
          "/products",
        title:
          "تخفيضات الكبرى",
      },
    ],
    [],
  );

  /**
   * =========================================================
   * الشرائح المخصصة
   * =========================================================
   */

  const customBanners =
    settings?.custom_banners_4to1?.filter(
      (banner) =>
        Boolean(
          banner.image &&
          banner.image.trim(),
        ),
    ) ?? [];

  const banners =
    customBanners.length > 0
      ? customBanners
      : defaultBanners;

  /**
   * =========================================================
   * حماية المؤشر عند تغير عدد الشرائح
   * =========================================================
   */

  useEffect(() => {
    if (
      banners.length === 0
    ) {
      setCurrentIndex(0);
      return;
    }

    setCurrentIndex(
      (current) =>
        current >= banners.length
          ? 0
          : current,
    );
  }, [banners.length]);

  /**
   * =========================================================
   * التشغيل التلقائي
   * =========================================================
   */

  useEffect(() => {
    if (
      banners.length <= 1
    ) {
      return;
    }

    const interval =
      window.setInterval(() => {
        setCurrentIndex(
          (previous) =>
            (previous + 1) %
            banners.length,
        );
      }, 4000);

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [banners.length]);

  /**
   * =========================================================
   * لا توجد شرائح
   * =========================================================
   */

  if (
    banners.length === 0
  ) {
    return null;
  }

  const currentBanner =
    banners[
      currentIndex
    ] ??
    banners[0];

  if (!currentBanner) {
    return null;
  }

  /**
   * =========================================================
   * العرض
   * =========================================================
   */

  return (
    <section className="mt-6 px-4">
      <div
        className="
          relative
          aspect-[4/1]
          w-full
          overflow-hidden
          rounded-2xl
          bg-secondary/40
          shadow-sm
          group
        "
      >
        <a
          href={
            currentBanner.link ||
            "#"
          }
          className="
            relative
            block
            h-full
            w-full
          "
          aria-label={
            currentBanner.title ||
            "إعلان متجر شهارة"
          }
        >
          <img
            src={
              currentBanner.image
            }
            alt={
              currentBanner.title ||
              "إعلان متجر شهارة"
            }
            loading="eager"
            className="
              h-full
              w-full
              object-cover
              transition-transform
              duration-500
              group-hover:scale-105
            "
          />
        </a>

        {banners.length > 1 ? (
          <div
            className="
              absolute
              bottom-2
              left-1/2
              z-10
              flex
              -translate-x-1/2
              items-center
              gap-1.5
            "
            role="tablist"
            aria-label="شرائح الإعلانات"
          >
            {banners.map(
              (
                banner,
                index,
              ) => (
                <button
                  key={`${banner.image}-${index}`}
                  type="button"
                  onClick={() =>
                    setCurrentIndex(
                      index,
                    )
                  }
                  className={`
                    h-1.5
                    rounded-full
                    transition-all
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-primary
                    ${
                      currentIndex ===
                      index
                        ? "w-5 bg-primary"
                        : "w-1.5 bg-white/60"
                    }
                  `}
                  aria-label={`الانتقال للشريحة ${index + 1}`}
                  aria-selected={
                    currentIndex ===
                    index
                  }
                  role="tab"
                />
              ),
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default BannerCarousel4to1;
