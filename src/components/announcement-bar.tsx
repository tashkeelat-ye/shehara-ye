import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { fetchSettings, type SiteSettings } from "@/lib/store";

/** شريط إعلانات وحالة المتجر — يُدار بالكامل من لوحة التحكم. */
export function AnnouncementBar() {
  const [s, setS] = useState<SiteSettings | null>(null);

  useEffect(() => {
    void (async () => setS(await fetchSettings()))();
  }, []);

  if (!s) return null;

  if (!s.is_open) {
    return (
      <div className="bg-destructive px-4 py-2 text-center text-[11px] text-destructive-foreground">
        {s.closed_message || "المتجر مغلق مؤقتًا."}
      </div>
    );
  }

  if (!s.announcement_active || !s.announcement_text) return null;

  const content = (
    <span className="inline-flex items-center justify-center gap-1.5">
      <Megaphone className="h-3.5 w-3.5" />
      {s.announcement_text}
    </span>
  );

  return (
    <div className="bg-primary px-4 py-2 text-center text-[11px] text-primary-foreground">
      {s.announcement_link ? (
        <a href={s.announcement_link} className="underline">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}
