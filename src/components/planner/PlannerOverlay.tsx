import { useEffect, useRef, useState } from "react";
import {
  Car,
  ChevronDown,
  History,
  Loader2,
  LocateFixed,
  MapPin,
  Minus,
  Paperclip,
  Plane,
  Plus,
  Shuffle,
  TrainFront,
  Wand2,
  X,
} from "lucide-react";
import { MOODS, MONTHS } from "@/lib/moods";
import { suggestCorrection } from "@/lib/places";
import {
  clearHistory,
  isHistoryEnabled,
  loadHistory,
  saveTripToHistory,
  setHistoryEnabled,
  type TripHistoryEntry,
} from "@/lib/history";
import { onOpenPlanner, TRIPS_CHANGED_EVENT, type OpenPlannerDetail } from "@/lib/events";
import { planTrip, samplePlan } from "@/lib/api";
import type {
  BudgetId,
  TransportPref,
  TripPlan,
  TripPlanRequest,
} from "@/lib/types";
import ResultView from "./ResultView";

const SAMPLE_PROMPT =
  "I'm planning a 7-day trip to Japan in October. I love food, hidden cafes, scenic hikes, and want to avoid crowds.";

const LOADING_LINES = [
  "Charting routes…",
  "Comparing stays…",
  "Balancing your budget…",
  "Checking the season…",
  "Finding the quiet spots…",
];

type Phase = "form" | "loading" | "result" | "error";
type BodyView = "planner" | "history";

/* ── loading: wireframe globe + orbiting plane ────────────────────────── */

function LoadingGlobe() {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setLineIndex((i) => (i + 1) % LOADING_LINES.length),
      1800,
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="py-14 flex flex-col items-center gap-10">
      <div className="globe-stage" aria-hidden="true">
        <div className="globe">
          <span className="globe-ring" />
          <span className="globe-ring" style={{ transform: "rotateY(60deg)" }} />
          <span className="globe-ring" style={{ transform: "rotateY(120deg)" }} />
          <div className="orbit">
            <span className="orbit-plane">
              <Plane className="w-6 h-6 text-wandor-accent" />
            </span>
          </div>
        </div>
      </div>
      <p className="text-white/70 text-sm tracking-wide" aria-live="polite">
        {LOADING_LINES[lineIndex]}
      </p>
    </div>
  );
}

/* ── small controls ───────────────────────────────────────────────────── */

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm cursor-pointer bg-transparent transition-all active:scale-95 ${
        active
          ? "border-wandor-accent bg-wandor-accent/15 text-white"
          : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; icon?: React.ComponentType<{ className?: string }> }[];
  label: string;
}) {
  return (
    <div>
      <p className="text-[12px] uppercase tracking-[0.1em] text-white/40 mb-2">{label}</p>
      <div className="flex rounded-xl border border-white/15 overflow-hidden">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              aria-pressed={active}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] cursor-pointer border-none bg-transparent transition-all active:scale-95 ${
                active ? "bg-wandor-accent text-white" : "text-white/55 hover:text-white"
              }`}
            >
              {opt.icon && <opt.icon className="w-4 h-4" />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── history view ─────────────────────────────────────────────────────── */

function HistoryView({
  historyOn,
  onToggleHistory,
  onBack,
  onOpen,
}: {
  historyOn: boolean;
  onToggleHistory: () => void;
  onBack: () => void;
  onOpen: (t: TripHistoryEntry) => void;
}) {
  const [entries, setEntries] = useState<TripHistoryEntry[]>(() =>
    historyOn ? loadHistory() : [],
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = () => setEntries(historyOn ? loadHistory() : []);

  const flipSwitch = () => {
    onToggleHistory(); // parent flips the state; turning off erases storage
    refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="self-start bg-transparent border-none cursor-pointer text-white/50 hover:text-white text-[13px] transition-colors"
      >
        ← Back to the planner
      </button>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div>
          <p className="text-white font-semibold text-[15px]">Save trips on this device</p>
          <p className="text-white/45 text-[12px] mt-0.5">
            Stored only in your browser — switching off erases everything.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={historyOn}
          onClick={flipSwitch}
          className={`relative w-12 h-7 rounded-full border-none cursor-pointer transition-colors flex-shrink-0 ${
            historyOn ? "bg-wandor-accent" : "bg-white/20"
          }`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
              historyOn ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      {!historyOn && (
        <p className="text-white/50 text-[13px]">
          History is switched off — flip the switch above to start keeping
          your trips.
        </p>
      )}

      {historyOn && entries.length === 0 && (
        <p className="text-white/50 text-[13px]">
          No trips saved yet — generate a plan and it will appear here with
          its total estimated cost.
        </p>
      )}

      {entries.map((t) => {
        const isOpen = expandedId === String(t.id || t.savedAt);
        const tiers = t.plan?.estimatedTotal || {};
        const intercity = t.plan?.routes?.intercity || [];
        const stays = t.plan?.stays || [];
        return (
          <div
            key={t.id || t.savedAt}
            className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : String(t.id || t.savedAt))}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-transparent border-none cursor-pointer text-left hover:bg-white/[0.04] transition-colors"
            >
              <span>
                <span className="block text-white text-[16px] font-bold">
                  {t.destination}
                </span>
                <span className="block text-[12px] text-white/45 mt-0.5">
                  {new Date(t.savedAt).toLocaleDateString()}
                  {t.days ? ` · ${t.days} days` : ""}
                  {t.tier ? ` · ${t.tier} tier` : ""}
                  {t.travelers ? ` · ${t.travelers} travelers` : ""}
                </span>
              </span>
              <span className="text-right flex-shrink-0">
                <span className="block tnum text-wandor-accent text-[16px] font-bold">
                  {t.totalCost || "—"}
                </span>
                <span className="block text-[10px] uppercase tracking-[0.1em] text-white/40 mt-0.5">
                  est. total
                </span>
              </span>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 flex flex-col gap-4">
                <p className="text-[12px] text-white/40">
                  Total estimated cost — covers travel, stays, food and
                  sightseeing for the whole trip.
                </p>

                {Object.keys(tiers).length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {(["budget", "mid", "luxury"] as const).map((tier) => (
                      <div
                        key={tier}
                        className={`rounded-xl border p-2.5 text-center ${
                          t.tier === tier
                            ? "border-wandor-accent/60 bg-wandor-accent/10"
                            : "border-white/10 bg-white/[0.02]"
                        }`}
                      >
                        <p className="text-[10px] uppercase tracking-[0.1em] text-white/40">
                          {tier}
                        </p>
                        <p className="tnum text-white text-[12px] mt-0.5">
                          {typeof tiers[tier] === "string" ? tiers[tier] : "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {intercity.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1.5">
                      Travel
                    </p>
                    <div className="flex flex-col gap-1">
                      {intercity.map((r, i) => (
                        <p key={i} className="tnum text-[13px] text-white/70">
                          <span className="text-white/90 capitalize">{`${r?.mode ?? ""}`}</span>
                          {" — "}
                          {r?.distanceKm ? `${r.distanceKm} km · ` : ""}
                          {`${r?.duration ?? ""}`}
                          {r?.approxCost ? ` · ${r.approxCost}` : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {stays.length > 0 && (
                  <p className="text-[13px] text-white/60">
                    {stays.length} stays planned — from{" "}
                    {`${stays[0]?.area || "the old town"}`} area outward.
                  </p>
                )}

                {t.plan ? (
                  <button
                    type="button"
                    onClick={() => onOpen(t)}
                    className="self-start bg-wandor-accent hover:bg-[#c93326] text-white border-none cursor-pointer text-[12px] font-bold uppercase tracking-[0.08em] px-5 py-2.5 rounded-full transition-all active:scale-95"
                  >
                    Open full itinerary →
                  </button>
                ) : (
                  <p className="text-[12px] text-white/35">
                    Full itinerary not stored for this entry — re-plan it from
                    the form.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── main overlay ─────────────────────────────────────────────────────── */

export default function PlannerOverlay() {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<OpenPlannerDetail>({});
  const [historyOn, setHistoryOn] = useState(isHistoryEnabled());
  const [bodyView, setBodyView] = useState<BodyView>("planner");
  const [restore, setRestore] = useState<{ plan: TripPlan; token: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastActive = useRef<Element | null>(null);

  const toggleHistory = () => {
    const next = !historyOn;
    setHistoryEnabled(next); // turning off also erases what was saved
    setHistoryOn(next);
  };

  useEffect(
    () =>
      onOpenPlanner((detail) => {
        setPrefill(detail);
        setBodyView(detail.view === "history" ? "history" : "planner");
        setOpen(true);
      }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    lastActive.current = document.activeElement;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      if (lastActive.current instanceof HTMLElement) lastActive.current.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Trip planner"
        className="relative w-full max-w-[880px] max-h-[92svh] flex flex-col rounded-[28px] border border-white/15 bg-[#0b0b0b] shadow-[0_40px_120px_rgba(0,0,0,0.6)] outline-none"
      >
        {/* header */}
        <div className="flex items-center justify-between gap-4 px-6 md:px-8 pt-5 pb-4 border-b border-white/10">
          <span className="inline-flex items-center gap-2.5">
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-wandor-accent" />
            <span className="stamp-label text-[12px] text-white/70">VeloceWay trip planner</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBodyView(bodyView === "history" ? "planner" : "history")}
              aria-pressed={bodyView === "history"}
              title="Your saved trips"
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 cursor-pointer text-[11px] font-semibold uppercase tracking-[0.08em] transition-all ${
                bodyView === "history"
                  ? "border-wandor-accent/60 text-wandor-accent"
                  : "border-white/15 text-white/70 hover:text-white"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close planner"
              className="bg-transparent border border-white/15 hover:border-white/40 rounded-full p-2 cursor-pointer text-white/60 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* body — the form stays mounted so nothing is lost while browsing history */}
        <div className="overlay-scroll overflow-y-auto px-6 md:px-8 py-6">
          <div style={{ display: bodyView === "planner" ? "block" : "none" }}>
            <PlannerBody
              prefill={prefill}
              historyOn={historyOn}
              restore={restore}
              key={prefill.inspirationName || "blank"}
            />
          </div>
          {bodyView === "history" && (
            <HistoryView
              historyOn={historyOn}
              onToggleHistory={toggleHistory}
              onBack={() => setBodyView("planner")}
              onOpen={(t) => {
                if (t.plan) {
                  setRestore({ plan: t.plan, token: Date.now() });
                  setBodyView("planner");
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── planner body ─────────────────────────────────────────────────────── */

function PlannerBody({
  prefill,
  historyOn,
  restore,
}: {
  prefill: OpenPlannerDetail;
  historyOn: boolean;
  restore: { plan: TripPlan; token: number } | null;
}) {
  const [phase, setPhase] = useState<Phase>("form");
  const [prompt, setPrompt] = useState(prefill.prompt || "");
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [moods, setMoods] = useState<string[]>(["food", "nature"]);
  const [month, setMonth] = useState("");
  const [travelers, setTravelers] = useState(2);
  const [days, setDays] = useState(7);
  const [budget, setBudget] = useState<BudgetId>("mid");
  const [transport, setTransport] = useState<TransportPref>("any");
  const [inspirationName, setInspirationName] = useState(prefill.inspirationName || "");
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [dismissedFor, setDismissedFor] = useState("");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [trips, setTrips] = useState<TripHistoryEntry[]>([]);

  useEffect(() => {
    if (prefill.prompt) setPrompt(prefill.prompt);
    if (prefill.destination) setDestination(prefill.destination);
    if (prefill.inspirationName) setInspirationName(prefill.inspirationName);
  }, [prefill]);

  // live "did you mean …?" while typing the destination
  useEffect(() => {
    const d = destination.trim();
    if (d.length < 4) {
      setSuggestion(null);
      return;
    }
    const fix = suggestCorrection(d);
    setSuggestion(fix && fix.toLowerCase() !== d.toLowerCase() ? fix : null);
  }, [destination]);

  // reload recent trips whenever the history toggle changes
  useEffect(() => {
    setTrips(historyOn ? loadHistory() : []);
  }, [historyOn]);

  // reload after cloud merges / sign-in syncs
  useEffect(() => {
    const onTrips = () => setTrips(historyOn ? loadHistory() : []);
    window.addEventListener(TRIPS_CHANGED_EVENT, onTrips);
    return () => window.removeEventListener(TRIPS_CHANGED_EVENT, onTrips);
  }, [historyOn]);

  // opening a saved trip from the History view
  useEffect(() => {
    if (restore?.plan) {
      setPlan(restore.plan);
      setPhase("result");
    }
  }, [restore]);

  /** Browser location → free OpenStreetMap reverse geocode → city name. */
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Your browser doesn't support location — type it instead.");
      return;
    }
    setLocating(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            { headers: { Accept: "application/json" } },
          );
          const data = await res.json();
          const a = data?.address || {};
          const place = a.city || a.town || a.village || a.county || a.state || "";
          if (place) {
            setSource(place);
          } else {
            setLocError("Couldn't name your city — type it instead.");
          }
        } catch {
          setLocError("Couldn't look up your city — type it instead.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — type your city instead."
            : "Couldn't get your location — type your city instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const acceptSuggestion = () => {
    if (suggestion) {
      setDismissedFor("");
      setDestination(suggestion);
    }
  };

  const toggleMood = (id: string) =>
    setMoods((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const generate = async () => {
    setPhase("loading");
    setErrorMsg("");
    const req: TripPlanRequest = {
      prompt: prompt.trim(),
      destination: destination.trim(),
      source: source.trim() || undefined,
      moods,
      month: month || undefined,
      travelers,
      days,
      budget,
      transportPreference: transport,
      inspirationName: inspirationName || undefined,
    };
    try {
      const result = await planTrip(req);
      setPlan(result);
      setPhase("result");
      // record in local history (only when the user keeps it switched on)
      if (historyOn && !result._mock && destination.trim()) {
        const totals = result.estimatedTotal || {};
        saveTripToHistory({
          id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
          savedAt: Date.now(),
          destination: destination.trim(),
          country:
            typeof result.tripSummary?.country === "string"
              ? result.tripSummary.country
              : undefined,
          totalCost:
            typeof totals[budget] === "string"
              ? totals[budget]
              : typeof totals.mid === "string"
                ? totals.mid
                : undefined,
          tier: budget,
          days,
          month: month || undefined,
          travelers,
          plan: result,
        });
        setTrips(loadHistory());
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    }
  };

  const useSample = () => {
    setPlan(samplePlan());
    setPhase("result");
  };

  /** Re-open a saved trip's full plan, or fill the form from its details. */
  const openTrip = (t: TripHistoryEntry) => {
    if (t.plan) {
      setPlan(t.plan);
      setPhase("result");
      return;
    }
    setDestination(t.destination);
    if (t.days) setDays(t.days);
    if (t.travelers) setTravelers(t.travelers);
    if (t.tier === "budget" || t.tier === "mid" || t.tier === "luxury")
      setBudget(t.tier);
    if (t.month) setMonth(t.month);
  };

  if (phase === "loading") {
    return (
      <div>
        <LoadingGlobe />
        <button
          type="button"
          onClick={() => setPhase("form")}
          className="block mx-auto bg-transparent border-none cursor-pointer text-white/40 hover:text-white text-[13px] transition-colors"
        >
          ← Back to the trip form
        </button>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="py-10">
        <div className="rounded-2xl border border-wandor-accent/40 bg-wandor-accent/10 p-5">
          <p className="text-white/85 text-sm leading-relaxed">{errorMsg}</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={generate}
            className="bg-wandor-accent hover:bg-[#c93326] text-white border-none cursor-pointer text-[12px] font-semibold uppercase tracking-[0.08em] px-6 py-3 rounded-full transition-all active:scale-95"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={useSample}
            className="bg-transparent border-none text-white/50 hover:text-white cursor-pointer text-[12px] font-semibold uppercase tracking-[0.08em] px-3 py-3 transition-colors"
          >
            Explore a sample plan →
          </button>
        </div>
      </div>
    );
  }

  if (phase === "result" && plan) {
    return (
      <ResultView
        plan={plan}
        onBack={() => setPhase("form")}
        preferred={transport}
        destination={destination.trim()}
      />
    );
  }

  /* ── form ── */
  return (
    <div className="flex flex-col gap-6">
      {historyOn && trips.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="stamp-label text-[10px] text-white/50">Recent trips</p>
            <button
              type="button"
              onClick={() => {
                clearHistory();
                setTrips([]);
              }}
              className="bg-transparent border-none cursor-pointer text-[11px] text-white/40 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-col">
            {trips.map((t) => (
              <button
                key={t.id || t.savedAt}
                type="button"
                title={t.plan ? "Open this saved itinerary" : "Re-use this trip's details"}
                onClick={() => openTrip(t)}
                className="flex items-center justify-between gap-3 w-full rounded-xl px-3 py-2 bg-transparent border-none cursor-pointer text-left hover:bg-white/[0.06] transition-colors"
              >
                <span>
                  <span className="text-white text-[14px] font-semibold">
                    {t.destination}
                  </span>
                  <span className="block text-[11px] text-white/40">
                    {t.days ? `${t.days} days · ` : ""}
                    {t.tier || "trip"} · {new Date(t.savedAt).toLocaleDateString()}
                  </span>
                </span>
                {t.totalCost && (
                  <span className="tnum text-wandor-accent text-[13px] whitespace-nowrap">
                    {t.totalCost}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="wandor-source"
            className="text-[12px] uppercase tracking-[0.1em] text-white/40"
          >
            Starting from (optional)
          </label>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[11px] font-semibold uppercase tracking-[0.08em] text-wandor-accent hover:text-[#ff5540] transition-colors disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LocateFixed className="w-3.5 h-3.5" />
            )}
            {locating ? "Locating…" : "Use my location"}
          </button>
        </div>
        <input
          id="wandor-source"
          type="text"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setLocError("");
          }}
          placeholder="Your starting city — e.g. Mumbai, London"
          className="w-full rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3.5 text-white text-[15px] outline-none placeholder-white/30 transition-colors focus:border-wandor-accent"
        />
        {locError ? (
          <p className="mt-2 text-[12px] text-wandor-accent">{locError}</p>
        ) : (
          <p className="mt-2 text-[12px] text-white/35">
            Routes and distances are calculated from here. Leave empty and
            we'll start from the nearest major hub.
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="wandor-destination"
          className="block text-[12px] uppercase tracking-[0.1em] text-white/40 mb-2"
        >
          Destination — where do you want to go?
        </label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-wandor-accent" />
          <input
            id="wandor-destination"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Country or city — e.g. Italy, Kyoto, Kerala"
            className="w-full rounded-2xl border border-white/15 bg-white/[0.05] pl-11 pr-4 py-3.5 text-white text-[15px] outline-none placeholder-white/30 transition-colors focus:border-wandor-accent"
          />
        </div>
        {suggestion && dismissedFor !== destination.trim() && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-wandor-accent/40 bg-wandor-accent/10 px-4 py-3">
            <p className="text-white/85 text-[13px]">
              Did you mean{" "}
              <span className="font-semibold text-white">{suggestion}</span>?
            </p>
            <div className="flex flex-wrap gap-2 ml-auto">
              <button
                type="button"
                onClick={acceptSuggestion}
                className="bg-wandor-accent hover:bg-[#c93326] text-white border-none cursor-pointer text-[11px] font-semibold uppercase tracking-[0.08em] px-4 py-2 rounded-full transition-all active:scale-95"
              >
                Yes — plan {suggestion}
              </button>
              <button
                type="button"
                onClick={() => setDismissedFor(destination.trim())}
                className="bg-transparent border border-white/20 hover:border-white/50 text-white/75 hover:text-white cursor-pointer text-[11px] font-semibold uppercase tracking-[0.08em] px-4 py-2 rounded-full transition-all"
              >
                Keep my spelling
              </button>
            </div>
          </div>
        )}
        <p className="mt-2 text-[12px] text-white/35">
          VeloceWay plans exactly this place — the sentence below only adds flavor.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="wandor-prompt"
            className="text-[12px] uppercase tracking-[0.1em] text-white/40"
          >
            Your trip, in one sentence{" "}
            <span className="normal-case tracking-normal text-white/25">(optional)</span>
          </label>
          <button
            type="button"
            onClick={() => {
              setPrompt(SAMPLE_PROMPT);
              setDestination("Japan");
            }}
            className="bg-transparent border-none cursor-pointer text-[11px] uppercase tracking-[0.08em] font-semibold text-white/40 hover:text-white transition-colors"
          >
            Use example
          </button>
        </div>
        <textarea
          id="wandor-prompt"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="I'm planning a 7-day trip to Japan in October…"
          className="w-full resize-none rounded-2xl border border-white/15 bg-white/[0.05] p-4 text-white text-[15px] leading-relaxed placeholder-white/30 outline-none transition-colors focus:border-wandor-accent"
        />
        {inspirationName && (
          <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/15 text-white/60 text-[12px] px-3 py-1.5">
            <Paperclip className="w-3.5 h-3.5" />
            {inspirationName}
            <button
              type="button"
              onClick={() => setInspirationName("")}
              aria-label="Remove inspiration file"
              className="bg-transparent border-none cursor-pointer text-white/40 hover:text-white p-0"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>

      <div>
        <p className="text-[12px] uppercase tracking-[0.1em] text-white/40 mb-2">
          Moods — pick what you're after
        </p>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((mood) => (
            <Chip
              key={mood.id}
              active={moods.includes(mood.id)}
              onClick={() => toggleMood(mood.id)}
            >
              <mood.icon className="w-4 h-4" />
              {mood.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label
            htmlFor="wandor-month"
            className="block text-[12px] uppercase tracking-[0.1em] text-white/40 mb-2"
          >
            Travel month
          </label>
          <select
            id="wandor-month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-white text-[14px] outline-none cursor-pointer transition-colors focus:border-wandor-accent"
          >
            <option value="" className="bg-[#0b0b0b]">
              Flexible — pick the best window
            </option>
            {MONTHS.map((m) => (
              <option key={m} value={m} className="bg-[#0b0b0b]">
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-[12px] uppercase tracking-[0.1em] text-white/40 mb-2">
            Travelers
          </p>
          <div className="flex items-center rounded-xl border border-white/15">
            <button
              type="button"
              onClick={() => setTravelers((t) => Math.max(1, t - 1))}
              aria-label="Fewer travelers"
              className="px-4 py-3 bg-transparent border-none cursor-pointer text-white/60 hover:text-white transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={String(travelers)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setTravelers(digits === "" ? 0 : Math.min(100, parseInt(digits, 10)));
              }}
              onBlur={() => setTravelers((t) => Math.max(1, Math.min(100, t)))}
              aria-label="Number of travelers"
              className="tnum flex-1 min-w-0 bg-transparent border-none text-center text-white text-[15px] py-3 outline-none"
            />
            <button
              type="button"
              onClick={() => setTravelers((t) => Math.min(100, t + 1))}
              aria-label="More travelers"
              className="px-4 py-3 bg-transparent border-none cursor-pointer text-white/60 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <p className="text-[12px] uppercase tracking-[0.1em] text-white/40 mb-2">
            Days to stay
          </p>
          <div className="flex items-center rounded-xl border border-white/15">
            <button
              type="button"
              onClick={() => setDays((d) => Math.max(1, d - 1))}
              aria-label="Fewer days"
              className="px-4 py-3 bg-transparent border-none cursor-pointer text-white/60 hover:text-white transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={String(days)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setDays(digits === "" ? 0 : Math.min(30, parseInt(digits, 10)));
              }}
              onBlur={() => setDays((d) => Math.max(1, Math.min(30, d)))}
              aria-label="Number of days to stay"
              className="tnum flex-1 min-w-0 bg-transparent border-none text-center text-white text-[15px] py-3 outline-none"
            />
            <button
              type="button"
              onClick={() => setDays((d) => Math.min(30, d + 1))}
              aria-label="More days"
              className="px-4 py-3 bg-transparent border-none cursor-pointer text-white/60 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Segmented<TransportPref>
          label="Intercity transport"
          value={transport}
          onChange={setTransport}
          options={[
            { id: "any", label: "Any", icon: Shuffle },
            { id: "flight", label: "Flight", icon: Plane },
            { id: "train", label: "Train", icon: TrainFront },
            { id: "ownVehicle", label: "Own car", icon: Car },
          ]}
        />

        <div className="sm:col-span-2">
          <Segmented<BudgetId>
            label="Budget level"
            value={budget}
            onChange={setBudget}
            options={[
              { id: "budget", label: "Backpack" },
              { id: "mid", label: "Comfort" },
              { id: "luxury", label: "Luxe" },
            ]}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={!destination.trim()}
        title={destination.trim() ? undefined : "Type a destination first"}
        className="mt-2 w-full flex items-center justify-center gap-2 bg-wandor-accent hover:bg-[#c93326] disabled:opacity-50 text-white border-none cursor-pointer font-sans text-[14px] font-bold uppercase tracking-[0.08em] py-4 rounded-full transition-all active:scale-[0.99]"
      >
        <Wand2 className="w-4 h-4" />
        Generate my plan
      </button>

      <button
        type="button"
        onClick={useSample}
        className="mx-auto bg-transparent border-none cursor-pointer text-white/40 hover:text-white text-[13px] transition-colors"
      >
        Just exploring? Open a sample plan →
      </button>
    </div>
  );
}
