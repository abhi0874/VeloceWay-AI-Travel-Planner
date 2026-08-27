/**
 * CityMap — an interactive, Google-Maps-dark style map of the destination city.
 *
 * Deliberately library-free: tiles, panning, zooming and pins are all rendered
 * here, so the app keeps its zero-extra-dependency footprint. Tiles are
 * standard OpenStreetMap raster tiles tinted into a dark palette with a CSS
 * filter; coordinates come from OSM's free Nominatim geocoder.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Layers, Loader2, Minus, Navigation, Plus } from "lucide-react";
import type { LocalRoute } from "@/lib/types";

const TILE = 256;
const MIN_Z = 3;
const MAX_Z = 18;

interface CityMapProps {
  destination: string;
  country?: string;
  places: LocalRoute[];
}

interface Pin {
  name: string;
  lat: number;
  lng: number;
  best?: string;
  distanceKm?: number;
}

interface LatLng {
  lat: number;
  lng: number;
}

type Status = "locating" | "pinning" | "ready" | "error";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ── Web Mercator ─────────────────────────────────────────────────────── */

const projectX = (lng: number, scale: number) => ((lng + 180) / 360) * scale;

const projectY = (lat: number, scale: number) => {
  const s = Math.sin((clamp(lat, -85.05112878, 85.05112878) * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale;
};

const unprojectLng = (x: number, scale: number) => (x / scale) * 360 - 180;

const unprojectLat = (y: number, scale: number) => {
  const n = Math.PI - (2 * Math.PI * y) / scale;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

/** Tightest zoom that still fits every pin inside the viewport. */
function fitPins(list: Pin[], w: number, h: number): { center: LatLng; zoom: number } | null {
  if (list.length === 0 || w === 0 || h === 0) return null;
  const lats = list.map((p) => p.lat);
  const lngs = list.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const center = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
  if (list.length === 1) return { center, zoom: 15 };

  for (let z = MAX_Z; z > MIN_Z; z--) {
    const scale = TILE * 2 ** z;
    const dx = Math.abs(projectX(maxLng, scale) - projectX(minLng, scale));
    const dy = Math.abs(projectY(minLat, scale) - projectY(maxLat, scale));
    // leave room for the floating panel on the left and the chrome below
    if (dx < w * 0.62 && dy < h * 0.68) return { center, zoom: z };
  }
  return { center, zoom: MIN_Z };
}

/* ── free geocoding (OpenStreetMap Nominatim, no key) ─────────────────── */

async function geocode(query: string): Promise<LatLng | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: string; lon?: string }[];
    if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

/* ── component ────────────────────────────────────────────────────────── */

export default function CityMap({ destination, country, places }: CityMapProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const homeRef = useRef<{ center: LatLng; zoom: number } | null>(null);
  const dragRef = useRef<{ px: number; py: number; cx: number; cy: number } | null>(null);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [center, setCenter] = useState<LatLng | null>(null);
  const [zoom, setZoom] = useState(13);
  const [pins, setPins] = useState<Pin[]>([]);
  const [status, setStatus] = useState<Status>("locating");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const placesKey = places.map((p) => (p.place || "").trim()).join("|");

  /* keep the viewport size in sync */
  useEffect(() => {
    const node = surfaceRef.current;
    if (!node) return;
    const read = () => {
      const next = { w: node.clientWidth, h: node.clientHeight };
      sizeRef.current = next;
      setSize(next);
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  /* resolve the city, then each itinerary place, one polite request at a time */
  useEffect(() => {
    if (!destination) return;
    let cancelled = false;

    (async () => {
      setStatus("locating");
      setPins([]);
      setActiveIdx(null);

      const city = await geocode(`${destination}${country ? ", " + country : ""}`);
      if (cancelled) return;
      if (!city) {
        setStatus("error");
        return;
      }
      setCenter(city);
      setZoom(13);
      homeRef.current = { center: city, zoom: 13 };

      const names = places
        .map((p) => ({ name: (p.place || "").trim(), best: p.best, distanceKm: p.distanceKm }))
        .filter((p) => p.name.length > 0);

      if (names.length === 0) {
        setStatus("ready");
        return;
      }

      setStatus("pinning");
      const collected: Pin[] = [];
      for (let i = 0; i < names.length; i++) {
        const hit = await geocode(
          `${names[i].name}, ${destination}${country ? ", " + country : ""}`,
        );
        if (cancelled) return;
        if (hit) {
          collected.push({ ...names[i], lat: hit.lat, lng: hit.lng });
          setPins([...collected]);
        }
        if (i < names.length - 1) await wait(1100); // Nominatim asks for ≤1 req/s
      }

      if (cancelled) return;
      const fit = fitPins(collected, sizeRef.current.w, sizeRef.current.h);
      if (fit) {
        setCenter(fit.center);
        setZoom(fit.zoom);
        homeRef.current = fit;
      }
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, country, placesKey]);

  /* ── geometry for the current view ── */

  const scale = TILE * 2 ** zoom;
  const originX = center ? projectX(center.lng, scale) - size.w / 2 : 0;
  const originY = center ? projectY(center.lat, scale) - size.h / 2 : 0;

  const tiles = useMemo(() => {
    if (!center || size.w === 0 || size.h === 0) return [];
    const n = 2 ** zoom;
    const out: { key: string; url: string; left: number; top: number }[] = [];
    const x0 = Math.floor(originX / TILE);
    const x1 = Math.floor((originX + size.w) / TILE);
    const y0 = Math.floor(originY / TILE);
    const y1 = Math.floor((originY + size.h) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = x0; tx <= x1; tx++) {
        const wx = ((tx % n) + n) % n; // wrap around the antimeridian
        out.push({
          key: `${zoom}/${tx}/${ty}`,
          url: `https://tile.openstreetmap.org/${zoom}/${wx}/${ty}.png`,
          left: tx * TILE - originX,
          top: ty * TILE - originY,
        });
      }
    }
    return out;
  }, [center, zoom, size.w, size.h, originX, originY]);

  /** Zoom by `delta` steps, keeping the point under `anchor` (px, viewport) fixed. */
  const zoomBy = useCallback(
    (delta: number, anchor?: { x: number; y: number }) => {
      if (!center) return;
      const z0 = zoom;
      const z1 = clamp(z0 + delta, MIN_Z, MAX_Z);
      if (z1 === z0) return;
      const ax = (anchor ? anchor.x : size.w / 2) - size.w / 2;
      const ay = (anchor ? anchor.y : size.h / 2) - size.h / 2;
      const s0 = TILE * 2 ** z0;
      const s1 = TILE * 2 ** z1;
      const k = s1 / s0;
      const px = (projectX(center.lng, s0) + ax) * k - ax;
      const py = (projectY(center.lat, s0) + ay) * k - ay;
      setZoom(z1);
      setCenter({ lat: unprojectLat(py, s1), lng: unprojectLng(px, s1) });
    },
    [center, zoom, size.w, size.h],
  );

  /* ctrl/⌘ + wheel zooms; a bare wheel is left to the page so the overlay
     can still be scrolled past the map */
  useEffect(() => {
    const node = surfaceRef.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const box = node.getBoundingClientRect();
      zoomBy(e.deltaY > 0 ? -1 : 1, { x: e.clientX - box.left, y: e.clientY - box.top });
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  /* ── drag to pan ── */

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!center) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      px: e.clientX,
      py: e.clientY,
      cx: projectX(center.lng, scale),
      cy: projectY(center.lat, scale),
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const nx = d.cx - (e.clientX - d.px);
    const ny = clamp(d.cy - (e.clientY - d.py), 0, scale);
    setCenter({ lat: unprojectLat(ny, scale), lng: unprojectLng(nx, scale) });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId);
  };

  const focusPin = (idx: number) => {
    const pin = pins[idx];
    if (!pin) return;
    setActiveIdx(idx);
    setCenter({ lat: pin.lat, lng: pin.lng });
    setZoom((z) => Math.max(z, 15));
  };

  const resetView = () => {
    const home = homeRef.current;
    if (!home) return;
    setActiveIdx(null);
    setCenter(home.center);
    setZoom(home.zoom);
  };

  /* ── render ── */

  return (
    <div className="vwx-map relative mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0d10] shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
      {/* tile surface */}
      <div
        ref={surfaceRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          zoomBy(1, { x: e.clientX - box.left, y: e.clientY - box.top });
        }}
        className={`relative h-[420px] w-full touch-none select-none overflow-hidden ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div className="vwx-tiles absolute inset-0">
          {tiles.map((t) => (
            <img
              key={t.key}
              src={t.url}
              alt=""
              draggable={false}
              loading="lazy"
              width={TILE}
              height={TILE}
              className="pointer-events-none absolute"
              style={{ left: t.left, top: t.top, width: TILE, height: TILE }}
            />
          ))}
        </div>

        {/* soft vignette so the floating chrome always stays readable */}
        <div className="vwx-vignette pointer-events-none absolute inset-0" />

        {/* pins */}
        {center &&
          pins.map((pin, i) => {
            const left = projectX(pin.lng, scale) - originX;
            const top = projectY(pin.lat, scale) - originY;
            if (left < -60 || top < -60 || left > size.w + 60 || top > size.h + 60) return null;
            const active = activeIdx === i;
            return (
              <button
                key={`${pin.name}-${i}`}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setActiveIdx(active ? null : i)}
                title={pin.name}
                aria-label={pin.name}
                className="vwx-pin-wrap absolute border-none bg-transparent p-0 cursor-pointer"
                style={{
                  left,
                  top,
                  transform: "translate(-50%, -100%)",
                  zIndex: active ? 4 : 3,
                }}
              >
                <span className={`vwx-pin ${active ? "is-active" : ""}`}>
                  <span className="vwx-pin-num">{i + 1}</span>
                </span>
                {active && (
                  <span className="vwx-bubble">
                    <span className="vwx-bubble-title">{pin.name}</span>
                    {(pin.best || pin.distanceKm) && (
                      <span className="vwx-bubble-sub">
                        {pin.best || ""}
                        {pin.best && pin.distanceKm ? " · " : ""}
                        {pin.distanceKm ? `${pin.distanceKm} km` : ""}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
      </div>

      {/* places panel — Google-Maps-style floating card */}
      {pins.length > 0 && (
        <div className="vwx-panel absolute left-4 top-4 z-[5] hidden w-[248px] flex-col md:flex">
          <div className="flex items-center justify-between px-3.5 pb-2 pt-3">
            <span className="stamp-label text-[10px] text-white/50">
              {pins.length} {pins.length === 1 ? "stop" : "stops"}
            </span>
            <Layers className="h-3.5 w-3.5 text-white/30" />
          </div>
          <div className="vwx-panel-list flex max-h-[300px] flex-col overflow-y-auto px-1.5 pb-2">
            {pins.map((pin, i) => (
              <button
                key={`row-${pin.name}-${i}`}
                type="button"
                onClick={() => focusPin(i)}
                className={`flex items-start gap-2.5 rounded-xl border-none px-2.5 py-2 text-left cursor-pointer transition-colors ${
                  activeIdx === i
                    ? "bg-wandor-accent/20"
                    : "bg-transparent hover:bg-white/[0.07]"
                }`}
              >
                <span
                  className={`mt-[2px] flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    activeIdx === i
                      ? "bg-wandor-accent text-white"
                      : "bg-white/15 text-white/75"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium leading-snug text-white">
                    {pin.name}
                  </span>
                  {(pin.best || pin.distanceKm) && (
                    <span className="block truncate text-[11px] text-white/45">
                      {pin.best || ""}
                      {pin.best && pin.distanceKm ? " · " : ""}
                      {pin.distanceKm ? `${pin.distanceKm} km` : ""}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* control stack */}
      <div className="absolute right-4 top-4 z-[5] flex flex-col gap-2">
        <div className="vwx-ctrl-group flex flex-col">
          <button
            type="button"
            onClick={() => zoomBy(1)}
            disabled={zoom >= MAX_Z}
            aria-label="Zoom in"
            title="Zoom in"
            className="vwx-ctrl vwx-ctrl-top"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(-1)}
            disabled={zoom <= MIN_Z}
            aria-label="Zoom out"
            title="Zoom out"
            className="vwx-ctrl vwx-ctrl-bottom"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={resetView}
          aria-label="Recenter the map"
          title={`Recenter on ${destination}`}
          className="vwx-ctrl vwx-ctrl-group"
        >
          <Crosshair className="h-4 w-4" />
        </button>
      </div>

      {/* destination badge */}
      <div className="vwx-badge absolute bottom-4 left-4 z-[5] flex items-center gap-2">
        <Navigation className="h-3.5 w-3.5 text-wandor-accent" />
        <span className="text-[12px] font-semibold text-white">{destination}</span>
        {country && <span className="text-[11px] text-white/40">{country}</span>}
      </div>

      {/* status + attribution */}
      <div className="absolute bottom-4 right-4 z-[5] flex flex-col items-end gap-2">
        {(status === "locating" || status === "pinning") && (
          <span className="vwx-badge flex items-center gap-2 text-[12px] text-white/75">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {status === "locating" ? "Finding the city…" : "Placing stops…"}
          </span>
        )}
        {status === "error" && (
          <span className="vwx-badge text-[12px] text-white/55">Map data unavailable</span>
        )}
        <span className="vwx-attrib">
          ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer noopener"
          >
            OpenStreetMap
          </a>{" "}
          · ⌘/Ctrl + scroll to zoom
        </span>
      </div>
    </div>
  );
}
