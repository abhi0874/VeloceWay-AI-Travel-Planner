import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { MOODS, SEASONS } from "@/lib/moods";
import {
  ApiError,
  sampleSuggestions,
  suggestDestinations,
} from "@/lib/api";
import type { DestinationIdea } from "@/lib/types";
import { useReveal } from "@/hooks/useReveal";
import TiltCard from "@/components/TiltCard";
import { Eyebrow } from "@/components/Sections";

/* deep, photo-less gradient panels — one per rank */
const PANEL_GRADIENTS = [
  "linear-gradient(160deg,#3b1d12 0%,#0f0a08 100%)",
  "linear-gradient(160deg,#0e2f2b 0%,#081211 100%)",
  "linear-gradient(160deg,#171b3a 0%,#0b0d1d 100%)",
  "linear-gradient(160deg,#1c2b16 0%,#0c120a 100%)",
  "linear-gradient(160deg,#2b1430 0%,#120a14 100%)",
  "linear-gradient(160deg,#1a222b 0%,#0b0e12 100%)",
];

function ordinal(n: number): string {
  return (["1st", "2nd", "3rd"] as const)[n - 1] ?? `${n}th`;
}

function RankedCard({ idea, index }: { idea: DestinationIdea; index: number }) {
  const ref = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="reveal h-full"
      style={{ transitionDelay: `${(index % 6) * 70}ms` }}
    >
      <TiltCard className="h-full">
        <article className="h-full flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <div
            className="relative h-44 p-5 flex flex-col justify-between"
            style={{ background: PANEL_GRADIENTS[index % PANEL_GRADIENTS.length] }}
          >
            <span className="self-start font-display text-[12px] tracking-[0.18em] uppercase text-white/80">
              {ordinal(index + 1)} pick
            </span>
            <span
              aria-hidden="true"
              className="absolute top-5 right-5 w-2 h-2 rounded-full bg-wandor-accent"
            />
            <div>
              <h3 className="text-white font-bold text-2xl leading-tight">
                {idea.name || "Somewhere good"}
              </h3>
              <p className="text-white/60 text-sm mt-0.5">{idea.country}</p>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-3 flex-1">
            <p className="text-white/70 text-sm leading-relaxed">{idea.why}</p>
            {idea.highlight && (
              <p className="text-white/50 text-[13px] leading-relaxed">
                <span className="text-wandor-accent font-medium">Highlight — </span>
                {idea.highlight}
              </p>
            )}

            <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-2">
              {idea.dailyBudget && (
                <p className="tnum text-[13px] text-white/60">
                  <span className="text-white/40">Per day — </span>
                  {idea.dailyBudget.budget}
                  {idea.dailyBudget.mid ? ` · ${idea.dailyBudget.mid}` : ""}
                  {idea.dailyBudget.currency ? ` (${idea.dailyBudget.currency})` : ""}
                </p>
              )}
              {idea.avgFlightHint && (
                <p className="tnum text-[13px] text-white/45">
                  <span className="text-white/35">Flights — </span>
                  {idea.avgFlightHint}
                </p>
              )}
              {Array.isArray(idea.bestMonths) && idea.bestMonths.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {idea.bestMonths.slice(0, 4).map((m) => (
                    <span
                      key={m}
                      className="text-[11px] uppercase tracking-[0.08em] border border-white/15 text-white/55 rounded-full px-2.5 py-1"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>
      </TiltCard>
    </div>
  );
}

export default function MoodExplorer() {
  const sectionRef = useReveal<HTMLElement>();
  const [selected, setSelected] = useState<string[]>(["food", "nature"]);
  const [season, setSeason] = useState("Autumn");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [ideas, setIdeas] = useState<DestinationIdea[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const toggleMood = (id: string) =>
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= 3
          ? prev
          : [...prev, id],
    );

  const generate = async () => {
    if (selected.length === 0) {
      setErrorMsg("Pick at least one mood first.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await suggestDestinations({ moods: selected, season });
      setIdeas(Array.isArray(res.destinations) ? res.destinations : []);
      setIsMock(Boolean(res._mock));
      setStatus("done");
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Something went wrong. Try again.",
      );
      setStatus("error");
    }
  };

  const useSamples = () => {
    const s = sampleSuggestions();
    setIdeas(Array.isArray(s.destinations) ? s.destinations : []);
    setIsMock(true);
    setStatus("done");
    setErrorMsg("");
  };

  return (
    <section
      id="discover"
      ref={sectionRef}
      className="reveal scroll-mt-16 max-w-[1200px] mx-auto px-6 py-20 md:py-28"
    >
      <div className="text-center flex flex-col items-center">
        <Eyebrow>Not sure where yet?</Eyebrow>
        <h2 className="mt-5 font-sans font-extrabold text-white leading-[1.02] tracking-[-0.02em] text-[clamp(30px,4.6vw,52px)]">
          Destination recommendations
        </h2>
        <p className="mt-4 text-white/55 text-[15px] leading-relaxed max-w-[480px]">
          Pick a mood or three, choose a season — get places that genuinely
          shine then, known and under-the-radar.
        </p>
      </div>

      {/* mood chips */}
      <div className="mt-10 flex flex-wrap justify-center gap-2.5">
        {MOODS.map((mood) => {
          const active = selected.includes(mood.id);
          return (
            <button
              key={mood.id}
              type="button"
              onClick={() => toggleMood(mood.id)}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm cursor-pointer bg-transparent transition-all active:scale-95 ${
                active
                  ? "border-wandor-accent bg-wandor-accent/15 text-white"
                  : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
              }`}
            >
              <mood.icon className="w-4 h-4" />
              {mood.label}
            </button>
          );
        })}
      </div>

      {/* season + generate */}
      <div className="mt-8 flex flex-wrap justify-center items-center gap-5">
        <div className="inline-flex rounded-full border border-white/15 p-1">
          {SEASONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSeason(s.id)}
              aria-pressed={season === s.id}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm cursor-pointer border-none bg-transparent transition-all active:scale-95 ${
                season === s.id
                  ? "bg-wandor-accent text-white"
                  : "text-white/55 hover:text-white"
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={status === "loading"}
          className="flex items-center gap-2 bg-wandor-accent hover:bg-[#c93326] disabled:opacity-60 text-white border-none cursor-pointer font-sans text-[13px] font-bold uppercase tracking-[0.08em] px-7 py-3.5 rounded-full transition-all active:scale-95"
        >
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {status === "loading" ? "Finding places" : "Suggest destinations"}
        </button>
      </div>

      {/* error */}
      {status === "error" && (
        <div className="mt-8 mx-auto max-w-[640px] rounded-2xl border border-wandor-accent/40 bg-wandor-accent/10 p-5 text-center">
          <p className="text-white/85 text-sm leading-relaxed">{errorMsg}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={generate}
              className="bg-wandor-accent hover:bg-[#c93326] text-white border-none cursor-pointer text-[12px] font-semibold uppercase tracking-[0.08em] px-5 py-2.5 rounded-full transition-all"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={useSamples}
              className="bg-transparent border-none text-white/50 hover:text-white cursor-pointer text-[12px] font-semibold uppercase tracking-[0.08em] px-3 py-2.5 transition-colors"
            >
              Use samples →
            </button>
          </div>
        </div>
      )}

      {/* results */}
      {status === "done" && ideas.length > 0 && (
        <>
          {isMock && (
            <p className="mt-10 text-center text-[13px] text-white/45 flex items-center justify-center gap-2">
              <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-wandor-accent inline-block" />
              Sample suggestions — live picks are on their way.
            </p>
          )}
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.slice(0, 6).map((idea, i) => (
              <RankedCard key={`${idea.name}-${i}`} idea={idea} index={i} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
