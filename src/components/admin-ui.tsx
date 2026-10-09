import type { ReactNode } from "react";

export const inputCls =
  "h-10 w-full rounded-xl border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary";
export const btnCls =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs text-primary-foreground disabled:opacity-60";
export const btnGhostCls =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-xs text-foreground";

export function AdminCard({
  title,
  action,
  actions,
  children,
}: {
  title?: string;
  action?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const extra = action ?? actions;
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4">
      {title || extra ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title ? <h2 className="text-sm text-foreground">{title}</h2> : <span />}
          {extra}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1 block text-[11px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
