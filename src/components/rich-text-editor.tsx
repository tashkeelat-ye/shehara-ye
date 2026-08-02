import { useEffect, useRef } from "react";
import { Bold, Heading2, Italic, Link2, List, Underline } from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  ariaLabel?: string;
};

/** محرر نصوص بسيط (Rich Text) للمحتوى داخل لوحة التحكم */
export function RichTextEditor({ value, onChange, ariaLabel = "محرر المحتوى" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  function run(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  }

  const tools = [
    { icon: Bold, label: "عريض", action: () => run("bold") },
    { icon: Italic, label: "مائل", action: () => run("italic") },
    { icon: Underline, label: "تحته خط", action: () => run("underline") },
    { icon: Heading2, label: "عنوان", action: () => run("formatBlock", "<h2>") },
    { icon: List, label: "قائمة", action: () => run("insertUnorderedList") },
    {
      icon: Link2,
      label: "رابط",
      action: () => {
        const url = window.prompt("أدخل الرابط");
        if (url) run("createLink", url);
      },
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap gap-1 border-b border-border bg-secondary p-1.5">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            aria-label={t.label}
            title={t.label}
            onClick={t.action}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-primary"
          >
            <t.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        className="prose-content min-h-40 max-h-[60vh] overflow-y-auto p-3 text-sm leading-relaxed text-foreground outline-none"
      />
    </div>
  );
}
