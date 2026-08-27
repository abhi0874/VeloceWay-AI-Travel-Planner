import { useState } from "react";
import {
  Calculator,
  BedDouble,
  Compass,
  Bus,
  Ticket,
  ExternalLink,
  PenLine,
  SlidersHorizontal,
  Luggage,
  Plane,
  ChevronDown,
  Mail,
  Phone,
  Clock,
  Instagram,
  Youtube,
} from "lucide-react";
import { useReveal } from "@/hooks/useReveal";
import { openPlanner } from "@/lib/events";

/* ── shared bits ──────────────────────────────────────────────────────── */

function RedDot({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block w-2 h-2 rounded-full bg-wandor-accent ${className}`}
    />
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <RedDot />
      <span className="stamp-label text-[12px] text-white/60">{children}</span>
    </span>
  );
}

function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useReveal<HTMLElement>();
  return (
    <section
      id={id}
      ref={ref}
      className={`reveal scroll-mt-16 max-w-[1200px] mx-auto px-6 py-20 md:py-28 ${className}`}
    >
      {children}
    </section>
  );
}

/* ── departures ticker ────────────────────────────────────────────────── */

const CITIES = [
  "Kyoto", "Barcelona", "Istanbul", "Queenstown", "Jaipur", "Marrakech",
  "Patagonia", "Hanoi", "Lisbon", "Vancouver", "Tbilisi", "Oaxaca",
];

export function DeparturesTicker() {
  const row = (key: string, hidden: boolean) => (
    <div key={key} aria-hidden={hidden} className="flex items-center flex-shrink-0">
      {CITIES.map((city) => (
        <span key={`${key}-${city}`} className="flex items-center">
          <span className="font-display text-[13px] tracking-[0.3em] uppercase text-white/60 whitespace-nowrap">
            {city}
          </span>
          <Plane className="w-3.5 h-3.5 text-wandor-accent mx-7 flex-shrink-0" />
        </span>
      ))}
    </div>
  );

  return (
    <div className="ticker overflow-hidden border-b border-white/10 py-4">
      <div className="ticker-track">
        {row("a", false)}
        {row("b", true)}
      </div>
    </div>
  );
}

/* ── dashed flight-path divider with plane ────────────────────────────── */

export function FlightPathDivider() {
  return (
    <div aria-hidden="true" className="relative h-16 md:h-20 max-w-[1200px] mx-auto pointer-events-none">
      <svg
        viewBox="0 0 1200 64"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <path
          d="M0,52 C300,52 420,14 600,14 C780,14 900,52 1200,52"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
          className="dash-flow"
        />
      </svg>
      <Plane className="absolute w-4 h-4 text-wandor-accent float-slow" style={{ left: "59%", top: "18%" }} />
    </div>
  );
}

/* ── features ─────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Calculator,
    title: "Honest cost estimates",
    desc: "Flights vs trains vs your own vehicle — compared side by side, priced in the destination's currency with realistic ranges.",
  },
  {
    icon: BedDouble,
    title: "Stays worth the area",
    desc: "Budget, mid-range and luxury picks placed where your itinerary actually takes you, with nightly rates.",
  },
  {
    icon: Compass,
    title: "Nearby detours",
    desc: "Half-day escapes and quiet towns around your base, with distances and travel times for each.",
  },
  {
    icon: Bus,
    title: "Local transport decoded",
    desc: "Metro cards, buses, bike rentals, taxis — what locals actually use and what each option costs.",
  },
  {
    icon: Ticket,
    title: "Attractions, ranked",
    desc: "Must-sees separated from filler, with the best hours to visit and what entry costs.",
  },
  {
    icon: ExternalLink,
    title: "Booking shortcuts",
    desc: "Deep links to Google Flights, IRCTC, Seat61 and stay sites — no affiliates, no markups.",
  },
];

export function FeatureStrip() {
  return (
    <Section id="features">
      <div className="mb-14">
        <Eyebrow>What you get</Eyebrow>
        <h2 className="mt-5 font-sans font-extrabold text-white leading-[1.02] tracking-[-0.02em] text-[clamp(30px,4.6vw,52px)] max-w-[720px]">
          Everything a trip needs, in one plan.
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-x-14">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="flex gap-6 py-7 border-t border-white/10 last:border-b md:[&:nth-last-child(2)]:border-b"
          >
            <span className="tnum font-semibold text-wandor-accent text-sm pt-1 w-7 flex-shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <div className="flex items-center gap-3">
                <f.icon className="w-[18px] h-[18px] text-white/70" />
                <h3 className="text-white font-semibold text-[17px]">{f.title}</h3>
              </div>
              <p className="mt-2 text-white/55 text-[15px] leading-relaxed max-w-[440px]">
                {f.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── how it works ─────────────────────────────────────────────────────── */

const STEPS = [
  {
    icon: PenLine,
    num: "1",
    title: "Tell it your plan",
    desc: "One sentence is enough — destination, month, what you love. Attach an inspiration photo if you have one.",
  },
  {
    icon: SlidersHorizontal,
    num: "2",
    title: "Tune the details",
    desc: "Set your moods, budget level and how you want to travel. The plan reshapes around your choices.",
  },
  {
    icon: Luggage,
    num: "3",
    title: "Pack and go",
    desc: "Get the full itinerary: costs, stays, day-by-day route, local transport and booking links.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how">
      <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-5 font-sans font-extrabold text-white leading-[1.02] tracking-[-0.02em] text-[clamp(30px,4.6vw,52px)]">
            Three steps to a plan.
          </h2>
        </div>
        <button
          type="button"
          onClick={() => openPlanner()}
          className="bg-wandor-accent text-white border-none cursor-pointer font-sans text-[13px] font-bold uppercase tracking-[0.08em] px-6 py-3.5 rounded-full transition-all hover:bg-[#c93326] active:scale-95"
        >
          Start planning
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-10 md:gap-14">
        {STEPS.map((s) => (
          <div key={s.num}>
            <span
              aria-hidden="true"
              className="tnum text-transparent font-bold text-[72px] leading-none select-none"
              style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.35)" }}
            >
              {s.num}
            </span>
            <div className="mt-4 flex items-center gap-3">
              <s.icon className="w-[18px] h-[18px] text-wandor-accent" />
              <h3 className="text-white font-semibold text-lg">{s.title}</h3>
            </div>
            <p className="mt-2 text-white/55 text-[15px] leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── contact ──────────────────────────────────────────────────────────── */

const CONTACT_EMAIL = "hello@veloceway.com";
const CONTACT_PHONE = "+91 98765 43210";
const CONTACT_PHONE_HREF = "+919876543210";

export function ContactSection() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    `Trip inquiry from ${form.name.trim() || "the website"}`,
  )}&body=${encodeURIComponent(
    `${form.message}\n\n— ${form.name}${form.email ? ` (${form.email})` : ""}`,
  )}`;

  const channels = [
    {
      icon: Mail,
      label: "Email",
      value: CONTACT_EMAIL,
      href: `mailto:${CONTACT_EMAIL}`,
    },
    {
      icon: Phone,
      label: "Phone",
      value: CONTACT_PHONE,
      href: `tel:${CONTACT_PHONE_HREF}`,
    },
    {
      icon: Clock,
      label: "Hours",
      value: "Mon–Sat · 9am–7pm IST",
    },
  ];

  return (
    <Section id="contact">
      <div className="mb-14">
        <Eyebrow>Contact</Eyebrow>
        <h2 className="mt-5 font-sans font-extrabold text-white leading-[1.02] tracking-[-0.02em] text-[clamp(30px,4.6vw,52px)]">
          Talk to a human.
        </h2>
        <p className="mt-4 text-white/55 text-[15px] leading-relaxed max-w-[520px]">
          Trip questions, group bookings, press — write or call, and we reply
          within one working day.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12">
        {/* channels */}
        <div className="flex flex-col gap-6">
          {channels.map((c) => (
            <div key={c.label} className="flex items-center gap-4">
              <span className="flex items-center justify-center w-11 h-11 rounded-full border border-wandor-accent/60 text-wandor-accent flex-shrink-0">
                <c.icon className="w-[18px] h-[18px]" />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-white/40">
                  {c.label}
                </p>
                {c.href ? (
                  <a
                    href={c.href}
                    className="text-white text-[16px] font-semibold hover:text-wandor-accent transition-colors"
                  >
                    {c.value}
                  </a>
                ) : (
                  <p className="text-white text-[16px] font-semibold">{c.value}</p>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <a
              href="https://instagram.com/veloceway"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="VeloceWay on Instagram"
              className="flex items-center justify-center w-10 h-10 rounded-full border border-white/15 hover:border-wandor-accent text-white/60 hover:text-white transition-all"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://youtube.com/@veloceway"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="VeloceWay on YouTube"
              className="flex items-center justify-center w-10 h-10 rounded-full border border-white/15 hover:border-wandor-accent text-white/60 hover:text-white transition-all"
            >
              <Youtube className="w-4 h-4" />
            </a>
            <span className="text-[13px] text-white/40 ml-1">@veloceway</span>
          </div>
        </div>

        {/* quick message */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <p className="stamp-label text-[12px] text-white/60 mb-5">Send a message</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              aria-label="Your name"
              className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-white text-[14px] outline-none placeholder-white/30 transition-colors focus:border-wandor-accent"
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Your email"
              aria-label="Your email"
              className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-white text-[14px] outline-none placeholder-white/30 transition-colors focus:border-wandor-accent"
            />
          </div>
          <textarea
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Where are you dreaming of going?"
            aria-label="Your message"
            className="mt-4 w-full resize-none rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-white text-[14px] leading-relaxed outline-none placeholder-white/30 transition-colors focus:border-wandor-accent"
          />
          <a
            href={mailto}
            className="mt-5 inline-flex items-center justify-center gap-2 bg-wandor-accent hover:bg-[#c93326] text-white border-none cursor-pointer font-sans text-[13px] font-bold uppercase tracking-[0.08em] px-7 py-3.5 rounded-full transition-all active:scale-95"
          >
            <Mail className="w-4 h-4" />
            Send message
          </a>
          <p className="mt-3 text-[12px] text-white/35">
            Opens your email app with everything filled in.
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ── FAQ ──────────────────────────────────────────────────────────────── */

const FAQS = [
  {
    q: "Which destinations can I plan?",
    a: "Anywhere — a single city, a region, or a whole country. Type it into the search bar at the top and VeloceWay builds a complete day-by-day plan around that exact place.",
  },
  {
    q: "How accurate are the costs?",
    a: "They're smart estimates in the destination's local currency — realistic ranges for independent travelers, clearly labeled as approximate. Every plan also includes direct search links to Google Flights, IRCTC and stay sites so you can check live fares where they're actually sold.",
  },
  {
    q: "Can I customize the plan?",
    a: "Yes. Set your moods, travel month, group size, budget level and how you want to get around — flight, train or your own vehicle — and the itinerary reshapes around your choices.",
  },
  {
    q: "Does it work on my phone?",
    a: "Fully. The site is built mobile-first — the planner, recommendations and contact section all adapt to small screens.",
  },
  {
    q: "How do I reach support?",
    a: "Email or call us — everything is in the contact section just below. We reply within one working day.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <Section id="faqs" className="max-w-[860px]">
      <div className="mb-12">
        <Eyebrow>Questions</Eyebrow>
        <h2 className="mt-5 font-sans font-extrabold text-white leading-[1.02] tracking-[-0.02em] text-[clamp(30px,4.6vw,52px)]">
          Fair questions.
        </h2>
      </div>

      <div>
        {FAQS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={item.q} className="border-t border-white/10 last:border-b">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-6 bg-transparent border-none cursor-pointer py-5 text-left"
              >
                <span className="text-white font-semibold text-[17px]">{item.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-wandor-accent flex-shrink-0 transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <p className="pb-6 pr-10 text-white/55 text-[15px] leading-relaxed">
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ── footer ───────────────────────────────────────────────────────────── */

export function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="max-w-[1200px] mx-auto px-6 py-14">
        <div className="flex flex-wrap items-start justify-between gap-10">
          <div>
            <span className="flex items-center gap-3 select-none">
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-wandor-accent" />
              <span className="font-sans font-extrabold uppercase tracking-[0.22em] text-white text-[16px]">
                VeloceWay
              </span>
            </span>
            <p className="mt-3 text-white/40 text-[15px]">Where will you go next?</p>
          </div>

          <nav className="flex flex-col gap-3">
            {[
              { label: "Destinations", id: "discover" },
              { label: "FAQs", id: "faqs" },
              { label: "Contact", id: "contact" },
            ].map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() =>
                  document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth" })
                }
                className="bg-transparent border-none cursor-pointer p-0 font-sans text-[13px] font-medium uppercase tracking-[0.08em] text-white/45 hover:text-white transition-colors text-left"
              >
                {l.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-wrap justify-between gap-3 text-[13px] text-white/35">
          <span>© 2026 VeloceWay</span>
          <span>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white transition-colors">
              {CONTACT_EMAIL}
            </a>
            {" · "}
            <a href={`tel:${CONTACT_PHONE_HREF}`} className="hover:text-white transition-colors">
              {CONTACT_PHONE}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
