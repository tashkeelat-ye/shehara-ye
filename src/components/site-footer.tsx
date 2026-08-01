import { Facebook, Instagram, Send } from "lucide-react";

const links = ["من نحن", "تواصل معنا", "سياسة الاستبدال والإرجاع", "الأسئلة الشائعة"];

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-border bg-card px-4 pb-24 pt-7 md:pb-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            ت
          </div>
          <div>
            <p className="text-base text-foreground">تشكيلات</p>
            <p className="text-[11px] text-muted-foreground">
              كل ما تحتاجه... بتشكيلة واحدة
            </p>
          </div>
        </div>

        <ul className="mt-5 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          {links.map((link) => (
            <li key={link}>
              <button type="button" className="transition-colors hover:text-primary">
                {link}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center gap-2">
          <p className="text-xs text-foreground">تابعنا:</p>
          {[Facebook, Instagram, Send].map((Icon, i) => (
            <button
              key={i}
              type="button"
              aria-label="حساب تشكيلات على وسائل التواصل"
              className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-primary"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          © ٢٠٢٦ تشكيلات — جميع الحقوق محفوظة
        </p>
      </div>
    </footer>
  );
}
