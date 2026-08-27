import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, MapPin } from "lucide-react";
import { openPlanner, openAuth, AUTH_CHANGED_EVENT } from "@/lib/events";
import { signOutUser, watchAuth, type AuthUser } from "@/lib/firebase";
import heroPhoto from "@/assets/hero.jpg";

/**
 * Original artwork — a procedurally generated alpine night scene at true
 * 2560×1440, bundled with the app. No licenses, no attribution, no network
 * dependency: it is entirely ours.
 */
const HERO_PHOTOS = [
  {
    src: heroPhoto,
    page: "",
    credit: "",
  },
];

const NAV_LINKS = [
  { label: "Destinations", target: "discover" },
  { label: "How It Works", target: "how" },
  { label: "FAQs", target: "faqs" },
  { label: "Contact", target: "contact" },
  { label: "Trip History", target: "__history" },
];

const POPULAR = ["Japan", "Italy", "Kerala", "Bali", "Iceland"];

const FACTS = [
  "Costs, compared — flights vs trains vs your own car, priced in the local currency.",
  "Ground truth — stays, nearby detours and local transport, decoded day by day.",
  "Mood-matched — name the vibe and the month; we match places that truly shine then.",
];

export default function Hero() {
  const [destination, setDestination] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const unsub = watchAuth(setUser);
    const onAuth = (e: Event) =>
      setUser(((e as CustomEvent).detail as AuthUser | null) ?? null);
    window.addEventListener(AUTH_CHANGED_EVENT, onAuth);
    return () => {
      unsub();
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuth);
    };
  }, []);
  // walks the high-res chain on load failure; ends at the bundled photo
  const [photoIndex, setPhotoIndex] = useState(0);
  const photo = HERO_PHOTOS[photoIndex]; // undefined once all have failed

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = destination.trim();
    if (d) openPlanner({ destination: d });
  };

  return (
    <section className="relative min-h-svh w-full overflow-hidden bg-wandor-night text-white">
      {/* Offline floor: deep alpine-night gradient */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[#0d1522] via-[#0a1018] to-[#05070b]"
      />
      {/* Real scenery on top */}
      {photo && (
        <img
          src={photo.src}
          onError={() => setPhotoIndex((i) => i + 1)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(1.05) contrast(1.06) brightness(0.82)" }}
          alt=""
          aria-hidden="true"
          loading="eager"
        />
      )}
      {/* cinematic darkening: this photo is bright daylight, so the veil is
          strong enough that every line of type stays clearly readable */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/25"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70"
      />

      <div className="relative z-10 max-w-[1360px] mx-auto px-6 md:px-20">
        {/* Nav */}
        <nav className="flex items-center justify-between py-6 border-b border-white/15">
          <span className="flex items-center gap-3 select-none">
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-wandor-accent" />
            <span className="font-sans font-extrabold uppercase tracking-[0.22em] text-white text-[15px] [text-shadow:0_1px_10px_rgba(0,0,0,0.4)]">
              VeloceWay
            </span>
          </span>

          <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => {
                  if (link.target === "__history") {
                    openPlanner({ view: "history" });
                    return;
                  }
                  document
                    .getElementById(link.target)
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-transparent border border-transparent rounded-full px-4 py-2 cursor-pointer font-sans font-extrabold text-[14px] whitespace-nowrap text-white/90 hover:bg-black/85 hover:border-white/15 hover:text-wandor-accent transition-all [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-[13px] text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">
                  Hi,{" "}
                  {(user.displayName || user.email || "traveler").split("@")[0]}
                </span>
                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  className="bg-transparent border border-white/25 hover:border-wandor-accent rounded-full px-4 py-2 cursor-pointer font-sans text-[13px] font-bold text-white/90 hover:text-wandor-accent transition-all [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuth("signin")}
                  className="bg-transparent border border-transparent rounded-full px-4 py-2 cursor-pointer font-sans font-bold text-[15px] text-white/90 hover:bg-black/85 hover:text-wandor-accent transition-all [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => openAuth("signup")}
                  className="bg-wandor-accent hover:bg-[#c93326] rounded-full px-5 py-2.5 cursor-pointer font-sans text-[13px] font-extrabold uppercase tracking-[0.06em] text-white shadow-[0_8px_28px_rgba(230,59,46,0.45)] transition-all active:scale-95"
                >
                  Sign up
                </button>
              </>
            )}
          </div>

        </nav>

        {/* Headline */}
        <div className="pt-14 md:pt-20">
          <p className="flex items-center gap-2.5 text-[12px] uppercase tracking-[0.2em] text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-wandor-accent" />
            Plan it in minutes
          </p>
          <h1
            className="mt-5 font-sans font-black uppercase text-white leading-[0.92] tracking-[-0.02em] text-[clamp(52px,10vw,144px)] [overflow-wrap:anywhere]"
            style={{ textShadow: "0 4px 28px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.25)" }}
          >
            Visit
            <br />
            {destination.trim() || "Anywhere"}
          </h1>
        </div>

        {/* Three quick facts */}
        <div className="mt-10 grid md:grid-cols-3 gap-6 md:gap-10 max-w-[860px]">
          {FACTS.map((fact) => (
            <p
              key={fact}
              className="text-[13px] leading-relaxed text-white/95 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]"
            >
              {fact}
            </p>
          ))}
        </div>

        {/* Destination picker */}
        <form onSubmit={submit} className="mt-10 flex flex-col md:flex-row gap-3 max-w-[760px]">
          <div className="relative flex-1">
            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-wandor-accent" />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Where do you want to go? — Japan, Italy, Kerala…"
              aria-label="Destination"
              className="w-full rounded-full border-2 border-white bg-white/95 shadow-[0_10px_36px_rgba(0,0,0,0.22)] backdrop-blur-md pl-12 pr-6 py-4 text-wandor-text text-[15px] font-medium outline-none placeholder-wandor-text/50 transition-colors focus:border-wandor-accent"
            />
          </div>
          <button
            type="submit"
            disabled={!destination.trim()}
            title={destination.trim() ? undefined : "Type a destination first"}
            className="flex items-center justify-center gap-2 bg-wandor-accent hover:bg-[#c93326] disabled:opacity-45 text-white border-none cursor-pointer font-sans text-[14px] font-extrabold uppercase tracking-[0.08em] px-8 py-4 rounded-full shadow-[0_10px_40px_rgba(230,59,46,0.45)] transition-all active:scale-95"
          >
            Plan my trip
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Popular chips */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <span className="text-[12px] uppercase tracking-[0.15em] text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.4)] mr-1">
            Popular
          </span>
          {POPULAR.map((place) => (
            <button
              key={place}
              type="button"
              onClick={() => setDestination(place)}
              className="rounded-full border border-white/80 bg-white/90 text-wandor-text hover:border-wandor-accent text-[13px] font-semibold px-4 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.15)] cursor-pointer transition-all active:scale-95"
            >
              {place}
            </button>
          ))}
        </div>

        {/* Scroll hint with red progress hairline (white over the dark forest) */}
        <div className="mt-12 pb-14 flex items-center gap-4">
          <span className="flex items-center gap-2 text-[12px] uppercase tracking-[0.3em] text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.45)]">
            Scroll
            <ChevronDown className="w-4 h-4 text-wandor-accent animate-bounce" />
          </span>
          <div className="relative h-px flex-1 bg-white/30">
            <span aria-hidden="true" className="absolute left-0 top-0 h-px w-24 bg-wandor-accent" />
          </div>
        </div>
      </div>
    </section>
  );
}
