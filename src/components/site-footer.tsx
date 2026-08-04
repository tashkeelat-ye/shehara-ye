import { useQuery } from "@tanstack/react-query";
import { Facebook, Instagram, Mail, MapPin, Music2, Phone, Send, Twitter } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { fetchSettings } from "@/lib/store";

const links = [
  { href: "/page/about", label: "من نحن" },
  { href: "/page/contact", label: "تواصل معنا" },
  { href: "/page/returns", label: "سياسة الاستبدال والإرجاع" },
  { href: "/faq", label: "الأسئلة الشائعة" },
  { href: "/page/privacy", label: "سياسة الخصوصية" },
  { href: "/page/delivery", label: "سياسة التوصيل" },
  { href: "/page/terms", label: "شروط الاستخدام" },
];

export function SiteFooter() {
  const { data: s } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const socials = [
    { url: s?.facebook, Icon: Facebook, label: "فيسبوك" },
    { url: s?.instagram, Icon: Instagram, label: "إنستغرام" },
    { url: s?.telegram, Icon: Send, label: "تيليجرام" },
    { url: s?.tiktok, Icon: Music2, label: "تيك توك" },
    { url: s?.twitter, Icon: Twitter, label: "إكس" },
  ].filter((x) => Boolean(x.url));

  return (
    <footer className="mt-8 border-t border-border bg-card px-4 pb-24 pt-7 md:pb-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2">
          <BrandLogo size={40} />
          <div>
            <p className="text-base text-foreground">{s?.store_name ?? "تشكيلات"}</p>
            <p className="text-[11px] text-muted-foreground">
              {s?.tagline ?? "كل ما تحتاجه... بتشكيلة واحدة"}
            </p>
          </div>
        </div>

        {s?.footer_note ? (
          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {s.footer_note}
          </p>
        ) : null}

        <ul className="mt-5 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-primary">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <ul className="mt-5 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          {s?.phone ? (
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-primary" />
              <a href={`tel:${s.phone}`} dir="ltr">
                {s.phone}
              </a>
            </li>
          ) : null}
          {s?.email ? (
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-primary" />
              <a href={`mailto:${s.email}`} dir="ltr">
                {s.email}
              </a>
            </li>
          ) : null}
          {s?.address ? (
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>{s.address}</span>
            </li>
          ) : null}
        </ul>

        {socials.length > 0 ? (
          <div className="mt-5 flex items-center gap-2">
            <p className="text-xs text-foreground">تابعنا:</p>
            {socials.map(({ url, Icon, label }) => (
              <a
                key={label}
                href={url!}
                target="_blank"
                rel="noreferrer"
                aria-label={`تشكيلات على ${label}`}
                className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-primary"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        ) : null}

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          {s?.footer_copyright || "© ٢٠٢٦ تشكيلات — جميع الحقوق محفوظة"}
        </p>
      </div>
    </footer>
  );
}
