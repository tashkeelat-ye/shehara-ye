import { useEffect, useRef, useState } from "react";
import { Check, LocateFixed, Loader2, MapPin } from "lucide-react";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const DEFAULT_CENTER: [number, number] = [15.3694, 44.191];

type Coordinates = { lat: number; lng: number };
export type LocationDetails = Coordinates & { accuracy?: number; address?: string };

type Props = {
  value: Coordinates | null;
  onChange?: (coords: Coordinates) => void;
  onConfirmed?: (location: LocationDetails) => void;
  readOnly?: boolean;
  height?: number;
};

function ensureLeafletCss() {
  if (document.querySelector(`link[href="${LEAFLET_CSS}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS;
  document.head.appendChild(link);
}

export function LocationPicker({
  value, onChange, onConfirmed, readOnly = false, height = 300,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [loadingAddress, setLoadingAddress] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      ensureLeafletCss();
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const start: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;
      const map = L.map(containerRef.current, {
        center: start, zoom: value ? 16 : 12, zoomControl: true,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "© OpenStreetMap",
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div style="width:24px;height:24px;border-radius:9999px;background:#D65A31;border:4px solid #fff;box-shadow:0 3px 14px rgba(0,0,0,.38)"></div>`,
        iconSize: [24, 24], iconAnchor: [12, 12],
      });

      const marker = L.marker(start, { draggable: !readOnly, icon }).addTo(map);
      markerRef.current = marker;
      mapRef.current = map;

      if (!readOnly) {
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          onChange?.({ lat: p.lat, lng: p.lng });
        });
        map.on("click", (e: any) => {
          marker.setLatLng(e.latlng);
          onChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      }

      setReady(true);
      window.setTimeout(() => map.invalidateSize(), 200);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove?.();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !value) return;
    markerRef.current?.setLatLng([value.lat, value.lng]);
    mapRef.current?.setView([value.lat, value.lng], 16, { animate: true });
  }, [ready, value]);

  useEffect(() => {
    if (!value) { setAddress(""); return; }
    let cancelled = false;
    const controller = new AbortController();
    setLoadingAddress(true);

    void fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(value.lat)}&lon=${encodeURIComponent(value.lng)}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" }, signal: controller.signal },
    )
      .then(async r => {
        if (!r.ok) throw new Error("reverse geocoding failed");
        return (await r.json()) as { display_name?: string };
      })
      .then(data => { if (!cancelled) setAddress(data.display_name ?? ""); })
      .catch(() => { if (!cancelled) setAddress(""); })
      .finally(() => { if (!cancelled) setLoadingAddress(false); });

    return () => { cancelled = true; controller.abort(); };
  }, [value]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocating(false);
        setAccuracy(position.coords.accuracy);
        onChange?.({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  function confirm() {
    if (!value) return;
    onConfirmed?.({
      ...value,
      accuracy: accuracy ?? undefined,
      address: address || undefined,
    });
  }

  return (
    <div className="space-y-3">
      <div ref={containerRef} style={{ height }}
        className="w-full overflow-hidden rounded-2xl border border-border bg-muted" />

      {!readOnly ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={useMyLocation} disabled={locating}
              className="inline-flex items-center gap-2 rounded-xl border border-[#0E4D64]/10 bg-[#0E4D64]/[0.05] px-3 py-2.5 text-xs font-black text-[#0E4D64] disabled:opacity-60">
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              {locating ? "جارٍ تحديد موقعي..." : "استخدام موقعي الحالي"}
            </button>
            {value ? (
              <button type="button" onClick={confirm}
                className="inline-flex items-center gap-2 rounded-xl bg-[#D65A31] px-4 py-2.5 text-xs font-black text-white">
                <Check className="h-4 w-4" /> اعتماد هذا الموقع
              </button>
            ) : null}
          </div>

          {value ? (
            <div className="rounded-2xl border border-[#0E4D64]/10 bg-white p-3 dark:bg-[#0A2A38]">
              <div className="flex items-start gap-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#D65A31]/10 text-[#D65A31]">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black text-muted-foreground">بيانات الموقع الحية</p>
                  <p dir="ltr" className="mt-1 text-[10px] font-bold text-foreground">
                    {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
                  </p>
                  {accuracy !== null ? <p className="mt-1 text-[9px] text-muted-foreground">دقة GPS: ±{Math.round(accuracy)} متر</p> : null}
                  <p className="mt-1 text-[9px] leading-4 text-muted-foreground">
                    {loadingAddress ? "جارٍ جلب اسم المنطقة..." : address || "حرّك الدبوس لتحديث الموقع."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">اضغط على الخريطة أو اسحب الدبوس لتحديد موقع التوصيل.</p>
          )}
        </>
      ) : null}
    </div>
  );
}

export default LocationPicker;
