export function SectionHeading({
  title,
  action = "عرض الكل",
}: {
  title: string;
  action?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4">
      <h2 className="flex min-w-0 items-center gap-2 text-base text-foreground sm:text-lg">
        <span className="h-5 w-1.5 shrink-0 rounded-full bg-accent-solid" />
        <span className="truncate">{title}</span>
      </h2>
      <button type="button" className="shrink-0 text-xs text-primary">
        {action}
      </button>
    </div>
  );
}
