import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Pause, Play, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

type Story = {
  id: string; title: string; image_url: string; link_url: string | null;
  sort_order: number; is_active: boolean; starts_at: string | null;
  expires_at: string | null; created_at: string;
};

const DURATION = 5000;

async function fetchStories(): Promise<Story[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (supabase as any).from("stories");
  const now = new Date().toISOString();
  const { data, error } = await table
    .select("id,title,image_url,link_url,sort_order,is_active,starts_at,expires_at,created_at")
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Story[] | null) ?? [];
}

export function StoriesCategories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetchStories()
      .then((data) => mounted && setStories(data))
      .catch((e) => console.warn("[Stories]", e))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const current = useMemo(() => selected == null ? null : stories[selected] ?? null, [selected, stories]);
  const close = useCallback(() => { setSelected(null); setProgress(0); setPaused(false); }, []);
  const next = useCallback(() => {
    if (selected == null) return;
    if (selected < stories.length - 1) {
      setSelected(selected + 1); setProgress(0); setPaused(false);
    } else close();
  }, [selected, stories.length, close]);
  const prev = useCallback(() => {
    if (selected == null) return;
    if (selected > 0) { setSelected(selected - 1); setProgress(0); setPaused(false); }
    else setProgress(0);
  }, [selected]);

  useEffect(() => {
    if (selected == null || !current || paused) return;
    const started = Date.now() - (progress / 100) * DURATION;
    const timer = window.setInterval(() => {
      const value = Math.min(100, ((Date.now() - started) / DURATION) * 100);
      setProgress(value);
      if (value >= 100) { window.clearInterval(timer); next(); }
    }, 40);
    return () => window.clearInterval(timer);
  }, [selected, current, paused, progress, next]);

  useEffect(() => {
    if (selected == null) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") next();
      if (e.key === "ArrowRight") prev();
      if (e.key === " ") { e.preventDefault(); setPaused(v => !v); }
    };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = old; window.removeEventListener("keydown", key); };
  }, [selected, close, next, prev]);

  if (loading) return (
    <section dir="rtl" className="border-b border-[#0E4D64]/5 bg-background py-4">
      <div className="flex gap-4 overflow-x-auto px-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex w-[76px] shrink-0 flex-col items-center gap-2">
            <Skeleton className="h-[70px] w-[70px] rounded-full" />
            <Skeleton className="h-3 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
  if (!stories.length) return null;

  return (
    <>
      <section dir="rtl" aria-label="قصص شهارة" className="border-b border-[#0E4D64]/[0.07] bg-background/95 py-3 backdrop-blur">
        <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-4 pb-1">
          {stories.map((story, i) => (
            <button key={story.id} type="button" onClick={() => { setSelected(i); setProgress(0); setPaused(false); }}
              className="group flex w-[76px] shrink-0 flex-col items-center gap-1.5 outline-none">
              <span className="relative block h-[72px] w-[72px] rounded-full bg-gradient-to-tr from-[#0E4D64] via-[#D65A31] to-[#E7C66A] p-[2.5px] shadow-lg transition duration-300 group-hover:scale-105 group-active:scale-90">
                <span className="block h-full w-full rounded-full bg-background p-[2.5px]">
                  <img src={story.image_url} alt={story.title || "قصة من شهارة"} loading={i < 4 ? "eager" : "lazy"}
                    className="h-full w-full rounded-full object-cover" />
                </span>
                <span className="absolute bottom-0 start-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-background bg-[#D65A31]" />
              </span>
              <span className="w-full truncate text-center text-[10px] font-black text-[#0E4D64] dark:text-white">{story.title || "شهارة"}</span>
            </button>
          ))}
        </div>
      </section>

      {current && selected != null ? (
        <div dir="rtl" className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/95 p-2 backdrop-blur-xl"
          role="dialog" aria-modal="true"
          onTouchStart={e => { touchStart.current = e.touches[0]?.clientX ?? null; }}
          onTouchEnd={e => {
            if (touchStart.current == null) return;
            const delta = (e.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
            touchStart.current = null;
            if (Math.abs(delta) > 50) delta > 0 ? prev() : next();
          }}>
          <div className="relative h-[min(92vh,900px)] w-full max-w-[500px] overflow-hidden rounded-[30px] bg-[#081D27] shadow-2xl ring-1 ring-white/10">
            <img src={current.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80" />
            <div className="absolute inset-x-3 top-3 z-30 flex gap-1" dir="ltr">
              {stories.map((s, i) => (
                <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-white transition-[width] duration-75" style={{ width: `${i < selected ? 100 : i === selected ? progress : 0}%` }} />
                </div>
              ))}
            </div>
            <div className="absolute inset-x-4 top-8 z-30 flex items-center justify-between gap-3">
              <div><p className="truncate text-sm font-black text-white">{current.title || "شهارة"}</p><p className="text-[9px] text-white/60">قصة {selected + 1} من {stories.length}</p></div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPaused(v => !v)} className="grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
                <button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <button type="button" onClick={prev} aria-label="السابق" className="absolute inset-y-24 start-0 z-20 w-1/4" />
            <button type="button" onClick={next} aria-label="التالي" className="absolute inset-y-24 end-0 z-20 w-1/4" />
            <div className="absolute bottom-0 inset-x-0 z-30 p-5">
              <h2 className="text-lg font-black text-white">{current.title || "شهارة"}</h2>
              {current.link_url ? <a href={current.link_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-xs font-black text-[#0E4D64] shadow-xl">اكتشف الآن <ExternalLink className="h-4 w-4" /></a> : null}
            </div>
            <button type="button" onClick={prev} className="absolute start-2 top-1/2 z-40 hidden -translate-y-1/2 rounded-full bg-black/35 p-2 text-white sm:block"><ChevronRight className="h-5 w-5" /></button>
            <button type="button" onClick={next} className="absolute end-2 top-1/2 z-40 hidden -translate-y-1/2 rounded-full bg-black/35 p-2 text-white sm:block"><ChevronLeft className="h-5 w-5" /></button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default StoriesCategories;
