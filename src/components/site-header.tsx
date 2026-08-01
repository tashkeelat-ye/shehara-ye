import { Search, ShoppingCart, User } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/95 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-lg text-primary-foreground shadow-brand">
              ت
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg leading-tight text-foreground">تشكيلات</p>
              <p className="truncate text-[11px] text-muted-foreground">
                كل ما تحتاجه... بتشكيلة واحدة
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="حسابي"
              className="grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent"
            >
              <User className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="سلة التسوق"
              className="relative grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-0.5 left-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent-solid px-1 text-[11px] text-accent-solid-foreground">
                ٣
              </span>
            </button>
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="ابحث عن منتج، ماركة، أو فئة..."
            aria-label="البحث في المتجر"
            className="h-11 w-full rounded-2xl border border-border bg-secondary pe-10 ps-4 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>
    </header>
  );
}
