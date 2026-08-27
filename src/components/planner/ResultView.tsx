import {
  ArrowRight,
  BedDouble,
  Bus,
  Car,
  Check,
  Clock,
  Compass,
  ExternalLink,
  Leaf,
  Plane,
  Ship,
  Star,
  Ticket,
  TrainFront,
  Wallet,
  Zap,
} from "lucide-react";
import type {
  Attraction,
  DayPlan,
  LocalTransportMode,
  NearbyDestination,
  Stay,
  TravelOption,
  TripPlan,
} from "@/lib/types";
import { buildBookingLinks } from "@/lib/bookingLinks";
import CityMap from "./CityMap";
import { samePlace } from "@/lib/places";
import type { IntercityRoute, LocalRoute } from "@/lib/types";

function modeIcon(mode: string) {
  const m = mode.toLowerCase();
  if (m.includes("flight") || m.includes("air")) return Plane;
  if (m.includes("train") || m.includes("shinkansen") || m.includes("rail")) return TrainFront;
  if (m.includes("bus")) return Bus;
  if (m.includes("car") || m.includes("vehicle") || m.includes("drive")) return Car;
  if (m.includes("ferry") || m.includes("boat") || m.includes("ship")) return Ship;
  if (m.includes("walk")) return Compass;
  return Bus;
}

/** "ownVehicle" → "Own Vehicle", "bus" → "Bus", "night bus" → "Night Bus". */
function formatMode(mode: string): string {
  const m = asStr(mode);
  if (!m) return "";
  return m
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* defensive helpers — LLM JSON varies, and a recovered partial plan varies more.
   asArray also drops null/non-object members so every .map below can read
   properties without a per-field guard. */
const asArray = <T,>(v: T[] | undefined): T[] =>
  Array.isArray(v) ? v.filter((x): x is T => x !== null && typeof x === "object") : [];
const asStr = (v: unknown): string => (typeof v === "string" ? v : "");
/** Safe React child for a value the model may return as a string OR a number. */
const asScalar = (v: unknown): string =>
  typeof v === "string" || typeof v === "number" ? String(v) : "";
const asNotes = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((n): n is string => typeof n === "string") : [];

const OPTION_META: { key: string; label: string; icon: typeof Plane }[] = [
  { key: "flight", label: "Flight", icon: Plane },
  { key: "train", label: "Train", icon: TrainFront },
  { key: "ownVehicle", label: "Own Vehicle", icon: Car },
];

function OptionCell({
  option,
  meta,
  preferred,
}: {
  option: TravelOption | undefined;
  meta: (typeof OPTION_META)[number];
  preferred: boolean;
}) {
  const Icon = meta.icon;
  return (
    <div className={`relative p-6 ${preferred ? "bg-wandor-accent/[0.08]" : ""}`}>
      {preferred && (
        <span className="absolute top-4 right-4 stamp-label text-[10px] text-wandor-accent">
          Your pick
        </span>
      )}
      <div className="flex items-center gap-2.5">
        <Icon className="w-[18px] h-[18px] text-wandor-accent" />
        <h4 className="stamp-label text-[12px] text-white/60">{meta.label}</h4>
      </div>
      <p className="mt-3 text-white text-[15px] font-medium leading-snug">
        {asStr(option?.estimate) || "—"}
      </p>
      {asNotes(option?.notes).length > 0 && (
        <ul className="mt-3 space-y-2">
          {asNotes(option?.notes).map((note, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] text-white/55 leading-relaxed">
              <span aria-hidden="true" className="mt-[7px] w-1 h-1 rounded-full bg-wandor-accent flex-shrink-0" />
              {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ResultView({
  plan,
  onBack,
  preferred,
  destination,
}: {
  plan: TripPlan;
  onBack: () => void;
  preferred?: string;
  destination?: string;
}) {
  const summary = plan.tripSummary;
  const plannedDestination = asStr(summary?.destination) || "Your destination";
  const country = asStr(summary?.country);
  const currency = asStr(summary?.currency);
  const options = plan.travelOptions || {};
  const preferredKey = preferred && preferred !== "any" ? preferred : undefined;

  const stays = asArray<Stay>(plan.stays);
  const days = asArray<DayPlan>(plan.dayByDay);
  const attractions = asArray<Attraction>(plan.attractions);
  const nearby = asArray<NearbyDestination>(plan.nearbyDestinations);
  const transportModes = asArray<LocalTransportMode>(plan.localTransport);
  const packingTips = asNotes(plan.packingTips);
  const bookingHints = asNotes(plan.bookingHints);
  const totals = plan.estimatedTotal || {};
  const bookingLinks = buildBookingLinks(plan);

  const routes = plan.routes;
  const intercity = asArray<IntercityRoute>(routes?.intercity);
  const localRoutes = asArray<LocalRoute>(routes?.local);

  // if the AI corrected a typo, say so
  const requested = (destination || "").trim();
  const plannedName = asStr(summary?.destination);
  const showCorrection = Boolean(
    requested && plannedName && !samePlace(requested, plannedName),
  );

  return (
    <div className="flex flex-col gap-10">
      {/* header */}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2.5">
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-wandor-accent" />
              <span className="stamp-label text-[12px] text-white/60">Your itinerary</span>
            </span>
            <h2 className="mt-3 font-sans font-extrabold uppercase text-white leading-none tracking-[-0.02em] text-[clamp(30px,5vw,46px)]">
              {plannedDestination}
            </h2>
            {(country || currency) && (
              <p className="mt-2 text-white/50 text-[15px]">
                {[country, currency].filter(Boolean).join(" · ")}
              </p>
            )}
            {showCorrection && (
              <p className="mt-2 text-[13px] text-white/50">
                <span className="font-medium text-wandor-accent">
                  Did you mean {plannedName}?
                </span>{" "}
                You typed "{requested}" — this itinerary is for {plannedName}.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="bg-transparent border border-white/15 hover:border-white/40 text-white/70 hover:text-white cursor-pointer text-[12px] font-semibold uppercase tracking-[0.08em] px-5 py-2.5 rounded-full transition-all"
          >
            ← Edit trip
          </button>
        </div>

        {asStr(summary?.whyGo) && (
          <p className="mt-5 text-white/75 leading-relaxed max-w-[640px] text-[15px]">
            {summary?.whyGo}
          </p>
        )}

        {plan._mock && (
          <div className="mt-5 rounded-2xl border border-wandor-accent/50 bg-wandor-accent/10 p-5">
            <p className="text-white/85 text-sm leading-relaxed">
              <span className="font-semibold text-wandor-accent">Demo itinerary.</span>{" "}
              This is VeloceWay's built-in sample trip (Kyoto, Japan)
              {destination ? ` — you asked for ${destination}` : ""}. Live
              planning is warming up; please try again shortly.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {asNotes(summary?.vibeTags).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/15 text-white/60 text-[11px] uppercase tracking-[0.08em] px-3 py-1.5"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* travel options — boarding pass */}
      <section aria-label="Travel options">
        <div className="rounded-3xl border border-white/15 bg-white/[0.03] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <span className="stamp-label text-[12px] text-white/60">Getting there</span>
          </div>
          <div className="grid md:grid-cols-3 md:divide-x divide-y md:divide-y-0 divide-white/10">
            {OPTION_META.map((meta) => (
              <OptionCell
                key={meta.key}
                option={options[meta.key]}
                meta={meta}
                preferred={preferredKey === meta.key}
              />
            ))}
          </div>

          {asStr(totals.budget) || asStr(totals.mid) || asStr(totals.luxury) ? (
            <div
              className="perf-notches relative border-t border-dashed border-white/20 px-6 py-5"
              style={{ "--notch-bg": "#0f0f0f" } as React.CSSProperties}
            >
              <div className="grid sm:grid-cols-3 gap-4 text-center">
                {(["budget", "mid", "luxury"] as const).map((tier) => (
                  <div key={tier}>
                    <p className="stamp-label text-[10px] text-white/40 uppercase">{tier}</p>
                    <p className="tnum mt-1 text-white text-[14px] font-medium">
                      {asStr(totals[tier]) || "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {asStr(summary?.dailyFoodBudget) && (
          <p className="tnum mt-3 text-[13px] text-white/45">
            Food per day — {summary?.dailyFoodBudget}
          </p>
        )}
      </section>

      {/* routes & distances */}
      {routes && (
        <section aria-label="Routes and distances">
          <span className="stamp-label text-[12px] text-white/60">Routes & distances</span>

          {routes.roadPossible === false && asStr(routes.roadNote) && (
            <div className="mt-4 rounded-2xl border border-wandor-accent/50 bg-wandor-accent/10 p-5">
              <p className="text-white/85 text-sm leading-relaxed">
                <span className="font-semibold text-wandor-accent">
                  No road route to {destination || plannedDestination}.
                </span>{" "}
                {routes.roadNote}
              </p>
            </div>
          )}

          {intercity.length > 0 && (
            <div className="mt-5 grid md:grid-cols-2 gap-4">
              {intercity.map((r, i) => {
                const Icon = modeIcon(asStr(r.mode));
                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-[18px] h-[18px] text-wandor-accent" />
                        <span className="text-white font-semibold text-[15px]">
                          {formatMode(asStr(r.mode)) || "Route"}
                        </span>
                      </span>
                      {asScalar(r.distanceKm) && (
                        <span className="tnum text-[12px] text-white/50">
                          {asScalar(r.distanceKm)} km
                        </span>
                      )}
                    </div>

                    <p className="mt-3 flex items-center gap-2 text-white/90 text-sm font-medium leading-snug">
                      {asStr(r.from) || "Origin"}
                      <ArrowRight className="w-3.5 h-3.5 text-wandor-accent flex-shrink-0" />
                      {asStr(r.to) || plannedDestination}
                    </p>
                    {asStr(r.via) && (
                      <p className="mt-1.5 text-white/50 text-[13px] leading-relaxed">
                        via {r.via}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-white/70 tnum">
                      {asStr(r.duration) && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-white/40" />
                          {r.duration}
                        </span>
                      )}
                      {asStr(r.approxCost) && (
                        <span className="flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5 text-white/40" />
                          {r.approxCost}
                        </span>
                      )}
                    </div>
                    {asStr(r.note) && (
                      <p className="mt-2.5 text-white/50 text-[13px] leading-relaxed">
                        {r.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {(routes?.cheapest || routes?.fastest) && (
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              {routes?.cheapest && (
                <div className="rounded-2xl border border-wandor-accent/50 bg-wandor-accent/10 p-5">
                  <p className="flex items-center gap-2 stamp-label text-[10px] text-wandor-accent">
                    <Wallet className="w-4 h-4" />
                    Cheapest way there
                  </p>
                  <p className="mt-2 text-white font-semibold text-[15px]">
                    {formatMode(asStr(routes.cheapest.mode))}
                  </p>
                  {asStr(routes.cheapest.summary) && (
                    <p className="mt-1 text-white/65 text-[13px] leading-relaxed">
                      {routes.cheapest.summary}
                    </p>
                  )}
                </div>
              )}
              {routes?.fastest && (
                <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-5">
                  <p className="flex items-center gap-2 stamp-label text-[10px] text-white/60">
                    <Zap className="w-4 h-4 text-wandor-accent" />
                    Fastest way there
                  </p>
                  <p className="mt-2 text-white font-semibold text-[15px]">
                    {formatMode(asStr(routes.fastest.mode))}
                  </p>
                  {asStr(routes.fastest.summary) && (
                    <p className="mt-1 text-white/65 text-[13px] leading-relaxed">
                      {routes.fastest.summary}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {localRoutes.length > 0 && (
            <>
              <p className="stamp-label text-[12px] text-white/60 mt-8">
                Getting around {plannedDestination}
              </p>
              <div className="mt-4 border-y border-white/10 divide-y divide-white/10">
                {localRoutes.slice(0, 8).map((l, i) => (
                  <div key={i} className="py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="text-white font-semibold text-[15px]">
                        {asStr(l.place) || "Place"}
                      </p>
                      <p className="tnum text-white/55 text-[13px] whitespace-nowrap">
                        {l.distanceKm !== undefined ? `${l.distanceKm} km` : ""}
                        {asStr(l.fromArea) ? ` from ${l.fromArea}` : ""}
                      </p>
                    </div>

                    {asArray(l.options).length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {asArray(l.options).map((o, j) => (
                          <span
                            key={j}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[12px] text-white/70"
                          >
                            {(() => {
                              const OIcon = modeIcon(asStr(o.mode));
                              return <OIcon className="w-3.5 h-3.5 text-wandor-accent" />;
                            })()}
                            {formatMode(asStr(o.mode))}
                            {asStr(o.duration) ? ` · ${o.duration}` : ""}
                            {asStr(o.approxCost) ? ` · ${o.approxCost}` : ""}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      {asStr(l.best) && (
                        <span className="text-[12px] font-medium text-wandor-accent">
                          Best — {l.best}
                        </span>
                      )}
                      {asStr(l.note) && (
                        <span className="text-[12px] text-white/40">{l.note}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {plannedDestination && (
                <>
                  <p className="stamp-label text-[12px] text-white/60 mt-8">
                    On the map
                  </p>
                  <CityMap
                    destination={plannedDestination}
                    country={country}
                    places={localRoutes.slice(0, 8)}
                  />
                </>
              )}
            </>
          )}
        </section>
      )}

      {/* day by day */}
      {days.length > 0 && (
        <section aria-label="Day-by-day plan">
          <span className="stamp-label text-[12px] text-white/60">The route, day by day</span>
          <ol className="mt-6 ml-3 relative border-l-2 border-dashed border-white/15 space-y-9">
            {days.map((day, i) => (
              <li key={i} className="pl-8 relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-wandor-night border-2 border-wandor-accent"
                />
                <p className="stamp-label text-[11px] text-wandor-accent">
                  Day {String(day.day ?? i + 1).padStart(2, "0")}
                </p>
                {asStr(day.title) && (
                  <h3 className="mt-1 text-white font-medium text-lg leading-snug">
                    {day.title}
                  </h3>
                )}
                <div className="mt-3 flex flex-col gap-2">
                  {(
                    [
                      ["Morning", day.morning],
                      ["Afternoon", day.afternoon],
                      ["Evening", day.evening],
                    ] as const
                  )
                    .filter(([, v]) => asStr(v))
                    .map(([label, v]) => (
                      <div key={label} className="grid sm:grid-cols-[92px_1fr] gap-x-4 gap-y-0.5">
                        <span className="stamp-label text-[10px] text-white/35 pt-0.5">{label}</span>
                        <span className="text-white/70 text-sm leading-relaxed">{v}</span>
                      </div>
                    ))}
                </div>
                {asStr(day.stayArea) && day.stayArea !== "—" && (
                  <p className="mt-2 flex items-center gap-2 text-[13px] text-white/40">
                    <BedDouble className="w-3.5 h-3.5" />
                    Sleep in {day.stayArea}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* stays */}
      {stays.length > 0 && (
        <section aria-label="Stays">
          <span className="stamp-label text-[12px] text-white/60">Stays, by tier</span>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stays.slice(0, 6).map((stay, i) => {
              const type = asStr(stay.type).toLowerCase();
              const badgeClass =
                type === "luxury"
                  ? "border-wandor-accent text-wandor-accent"
                  : type === "mid-range" || type === "midrange"
                    ? "border-white/40 text-white"
                    : "border-white/25 text-white/55";
              return (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <span className={`stamp-label inline-block text-[10px] border rounded-full px-2.5 py-1 ${badgeClass}`}>
                    {asStr(stay.type) || "stay"}
                  </span>
                  <h3 className="mt-3 text-white font-semibold text-[15px] leading-snug">
                    {asStr(stay.name) || "Stay"}
                  </h3>
                  {asStr(stay.area) && (
                    <p className="text-white/45 text-[13px] mt-0.5">{stay.area}</p>
                  )}
                  {asScalar(stay.approxPerNight) && (
                    <p className="tnum mt-2 text-white/80 text-[14px]">
                      ≈ {asScalar(stay.approxPerNight)}
                      <span className="text-white/40"> / night</span>
                    </p>
                  )}
                  {asStr(stay.why) && (
                    <p className="mt-2 text-white/55 text-[13px] leading-relaxed">{stay.why}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* attractions */}
      {attractions.length > 0 && (
        <section aria-label="Attractions">
          <span className="stamp-label text-[12px] text-white/60">What to see</span>
          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            {attractions.slice(0, 12).map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                {a.mustSee ? (
                  <Star className="w-[18px] h-[18px] text-wandor-accent flex-shrink-0" fill="currentColor" />
                ) : (
                  <Ticket className="w-[18px] h-[18px] text-white/30 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className={`text-[15px] leading-snug ${a.mustSee ? "text-white font-medium" : "text-white/80"}`}>
                    {asStr(a.name) || "Attraction"}
                    {a.mustSee && (
                      <span className="stamp-label ml-2 text-[9px] text-wandor-accent align-middle">
                        Must see
                      </span>
                    )}
                  </p>
                  <p className="text-white/40 text-[12px] uppercase tracking-[0.06em] mt-0.5">
                    {asStr(a.category)}
                    {asStr(a.bestTime) ? ` · best ${a.bestTime}` : ""}
                  </p>
                  {asStr(a.entryFee) && (
                    <p className="tnum text-white/50 text-[12px] mt-1">{a.entryFee}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* nearby */}
      {nearby.length > 0 && (
        <section aria-label="Nearby destinations">
          <span className="stamp-label text-[12px] text-white/60">Nearby detours</span>
          <div className="mt-5 border-y border-white/10 divide-y divide-white/10">
            {nearby.slice(0, 8).map((n, i) => (
              <div key={i} className="py-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <div className="min-w-0">
                  <p className="text-white font-semibold text-[15px] flex items-center gap-2">
                    <Compass className="w-4 h-4 text-wandor-accent flex-shrink-0" />
                    {asStr(n.name) || "Detour"}
                  </p>
                  {asStr(n.whyVisit) && (
                    <p className="text-white/55 text-sm mt-1 leading-relaxed max-w-[560px]">
                      {n.whyVisit}
                    </p>
                  )}
                </div>
                <p className="tnum text-white/60 text-sm whitespace-nowrap">
                  {n.distanceKm !== undefined ? `${n.distanceKm} km` : ""}
                  {asStr(n.travelTime) ? `${n.distanceKm !== undefined ? " · " : ""}${n.travelTime}` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* local transport */}
      {transportModes.length > 0 && (
        <section aria-label="Local transport">
          <span className="stamp-label text-[12px] text-white/60">Getting around locally</span>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {transportModes.slice(0, 6).map((t, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="flex items-center gap-2 text-white font-medium text-sm">
                  <Bus className="w-4 h-4 text-wandor-accent flex-shrink-0" />
                  {asStr(t.mode) || "Mode"}
                </p>
                {asStr(t.detail) && (
                  <p className="mt-1.5 text-white/55 text-[13px] leading-relaxed">{t.detail}</p>
                )}
                {asStr(t.approxCost) && (
                  <p className="tnum mt-2 text-wandor-accent text-[13px]">{t.approxCost}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* season notes */}
      {asStr(plan.seasonNotes) && (
        <div className="rounded-2xl border-l-4 border-wandor-accent bg-white/[0.04] p-5">
          <p className="flex items-start gap-3 text-white/75 text-sm leading-relaxed">
            <Leaf className="w-4 h-4 text-wandor-accent flex-shrink-0 mt-0.5" />
            <span>
              <span className="stamp-label text-[10px] text-white/45 block mb-1">Season notes</span>
              {plan.seasonNotes}
            </span>
          </p>
        </div>
      )}

      {/* packing + booking hints */}
      {(packingTips.length > 0 || bookingHints.length > 0) && (
        <section className="grid md:grid-cols-2 gap-8">
          {packingTips.length > 0 && (
            <div>
              <span className="stamp-label text-[12px] text-white/60">Pack this</span>
              <ul className="mt-4 space-y-2.5">
                {packingTips.map((tip, i) => (
                  <li key={i} className="flex gap-2.5 text-white/65 text-sm leading-relaxed">
                    <Check className="w-4 h-4 text-wandor-accent flex-shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {bookingHints.length > 0 && (
            <div>
              <span className="stamp-label text-[12px] text-white/60">Book smart</span>
              <ul className="mt-4 space-y-2.5">
                {bookingHints.map((hint, i) => (
                  <li key={i} className="flex gap-3 text-white/65 text-sm leading-relaxed">
                    <span className="tnum text-wandor-accent font-semibold flex-shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {hint}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* booking links */}
      <section aria-label="Booking links" className="border-t border-white/10 pt-6">
        <span className="stamp-label text-[12px] text-white/60">Check live fares</span>
        <div className="mt-4 flex flex-wrap gap-3">
          {bookingLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-white/20 hover:border-wandor-accent text-white/70 hover:text-white text-sm px-4 py-2.5 transition-all"
            >
              {link.label}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-white/35">
          Search links only — no affiliates, no markups. Estimates above are AI-generated ranges.
        </p>
      </section>
    </div>
  );
}
