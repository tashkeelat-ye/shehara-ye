import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const DEFAULT_CENTER: [number, number] = [15.3694, 44.191]; // صنعاء

function ensureLeafletCss() {
  if (document.querySelector(`link[href="${LEAFLET_CSS}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS;
  document.head.appendChild(link);
}

type Props = {
  value: { lat: number; lng: number } | null;
  onChange?: (coords: { lat: number; lng: number }) => void;
  readOnly?: boolean;
  height?: number;
};

/** خريطة تفاعلية (Leaflet + OpenStreetMap) لتحديد موقع التوصيل */
export function LocationPicker({ value, onChange, readOnly = false, height = 260 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      ensureLeafletCss();
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const start: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;
      const map = L.map(containerRef.current, {
        center: start,
        zoom: value ? 15 : 12,
        attributionControl: true,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div style="width:22px;height:22px;border-radius:9999px;background:#c2185b;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const marker = L.marker(start, { draggable: !readOnly, icon }).addTo(map);
      markerRef.current = marker;
      mapRef.current = map;

      if (!readOnly) {
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          onChange?.({ lat: p.lat, lng: p.lng });
        });
        map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
          marker.setLatLng(e.latlng);
          onChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      }
      setReady(true);
      setTimeout(() => map.invalidateSize(), 200);
    })();

    return () => {
      cancelled = true;
      const map = mapRef.current as { remove?: () => void } | null;
      map?.remove?.();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !value) return;
    const marker = markerRef.current as { setLatLng: (v: [number, number]) => void } | null;
    const map = mapRef.current as { setView: (v: [number, number], z: number) => void } | null;
    marker?.setLatLng([value.lat, value.lng]);
    map?.setView([value.lat, value.lng], 16);
  }, [ready, value]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange?.({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full overflow-hidden rounded-xl border border-border bg-muted"
      />
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={useMyLocation}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground"
          >
            <LocateFixed className="h-4 w-4" />
            {locating ? "جارٍ تحديد الموقع..." : "استخدام موقعي الحالي"}
          </button>
          <p className="text-[11px] text-muted-foreground">
            {value
              ? `الإحداثيات: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
              : "اضغط على الخريطة أو اسحب الدبوس لتحديد موقعك"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
