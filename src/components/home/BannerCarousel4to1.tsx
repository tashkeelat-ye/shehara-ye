import { useState, useEffect } from "react";
import { fetchSettings, type SiteSettings } from "@/lib/store";

export function BannerCarousel4to1() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    void (async () => {
      const data = await fetchSettings();
      setSettings(data);
    })();
  }, []);

  // صور افتراضية تظهر دائماً لضمان عدم اختفاء القسم، ويتم استبدالها تلقائياً بالصور المضافة من لوحة التحكم
  const defaultBanners = [
    {
      image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=300&fit=crop",
      link: "/products",
      title: "عرض خاص 4:1"
    },
    {
      image: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200&h=300&fit=crop",
      link: "/products",
      title: "تخفيضات الكبرى"
    }
  ];

  // التحقق مما إذا كان هناك بنرات مضافة من لوحة التحكم وتحتوي على صور صالحة
  const customBanners = settings?.custom_banners_4to1?.filter(b => b.image && b.image.trim() !== "") || [];
  const banners = customBanners.length > 0 ? customBanners : defaultBanners;

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners || banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  return (
    <section className="mt-6 px-4">
      <div className="relative overflow-hidden rounded-2xl shadow-sm aspect-[4/1] w-full bg-secondary/40 group">
        <a 
          href={currentBanner.link || "#"} 
          className="block w-full h-full relative"
        >
          <img
            src={currentBanner.image}
            alt={currentBanner.title || "إعلان متجر تشكيلات"}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </a>

        {/* نقاط التنقل بين الشرائح */}
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {banners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  currentIndex === idx ? "w-5 bg-primary" : "w-1.5 bg-white/60"
                }`}
                aria-label={`الانتقال للشريحة ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default BannerCarousel4to1;
