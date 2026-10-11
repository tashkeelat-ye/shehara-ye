import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "shehara_install_dismissed";

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone || localStorage.getItem(KEY)) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      const t = window.setTimeout(() => setIos(true), 4000);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!evt && !ios) return null;

  const close = () => {
    localStorage.setItem(KEY, "1");
    setEvt(null);
    setIos(false);
  };

  return (
    <div dir="rtl" className="fixed inset-x-3 bottom-[96px] z-[95] mx-auto max-w-md rounded-3xl border border-[#0E4D64]/10 bg-[color:var(--background)] p-4 shadow-[0_20px_50px_-20px_rgba(14,77,100,0.7)] md:bottom-6">
      <button type="button" aria-label="إغلاق" onClick={close} className="absolute end-3 top-3 text-muted-foreground">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3">
        <img src="/icon-192.png" alt="شهارة" className="h-14 w-14 shrink-0 rounded-2xl" />
        <div className="min-w-0">
          <p className="text-sm font-black text-[#0E4D64] dark:text-white">ثبّت تطبيق شهارة</p>
          <p className="text-xs text-muted-foreground">
            {ios ? "اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»." : "وصول أسرع وإشعارات فورية من شاشتك الرئيسية."}
          </p>
        </div>
      </div>
      {evt ? (
        <button
          type="button"
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice;
            close();
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D65A31] py-3 text-sm font-black text-white active:scale-[0.98]"
        >
          <Download className="h-4 w-4" /> تثبيت التطبيق
        </button>
      ) : null}
    </div>
  );
}
