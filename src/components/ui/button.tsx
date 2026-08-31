import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius)] transition-all";

  const sizes: Record<ButtonProps["size"], string> = {
    sm: "px-3 py-2 text-[13px] min-h-[36px]",
    md: "px-4 py-3 text-[15px] min-h-[44px]",
    lg: "px-5 py-4 text-[16px] min-h-[52px]",
  } as const;

  const variants: Record<ButtonProps["variant"], string> = {
    primary: `bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[0_6px_18px_-8px_rgba(14,77,100,0.45)] hover:brightness-95 active:scale-95`,
    secondary: `bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--border)] hover:bg-[rgba(14,77,100,0.08)]`,
    ghost: `bg-transparent text-[var(--color-foreground)]`,
    danger: `bg-[var(--color-danger, var(--sh-danger))] text-white`,
  } as const;

  return (
    <button
      {...rest}
      className={[base, sizes[size], variants[variant], className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

export default Button;
