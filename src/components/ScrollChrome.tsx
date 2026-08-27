import { useEffect, useState } from "react";
import { Plane } from "lucide-react";

/** Thin red scroll-progress hairline pinned to the top of the viewport. */
export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed top-0 left-0 right-0 h-[3px] z-[70]">
      <div
        className="h-full bg-wandor-accent"
        style={{ width: `${(progress * 100).toFixed(2)}%` }}
      />
    </div>
  );
}

const RAIL_SECTIONS = [
  { id: "features", num: "01" },
  { id: "discover", num: "02" },
  { id: "faqs", num: "03" },
  { id: "contact", num: "04" },
];

/**
 * Editorial numbered rail. Each item is a tiny pill showing just its number;
 * hovering pops a small black rounded box around THAT word alone, and the
 * active section keeps the red bar.
 */
export function SectionRail() {
  // start with a visible red bar on the first section (old behaviour)
  const [active, setActive] = useState("features");

  useEffect(() => {
    const els = RAIL_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <nav
      aria-label="Page sections"
      className="fixed right-6 top-1/2 -translate-y-1/2 z-30 hidden lg:flex flex-col items-end gap-4"
    >
      {/* quick link back to the hero */}
      <button
        type="button"
        aria-label="Plan my trip — back to the top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="group flex items-center bg-transparent border border-transparent rounded-full p-1.5 cursor-pointer transition-all duration-300 hover:bg-black/85 hover:border-white/15 hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)] mb-1"
      >
        <span
          aria-hidden="true"
          className="h-[2px] w-0 rounded-full bg-wandor-accent transition-all duration-300 group-hover:w-5 group-hover:mr-2.5"
        />
        <span className="stamp-label text-[10px] font-semibold uppercase max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 overflow-hidden whitespace-nowrap transition-all duration-300 group-hover:mr-2.5 text-wandor-accent">
          Plan my trip
        </span>
        <Plane className="w-3.5 h-3.5 text-wandor-accent transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        <span
          aria-hidden="true"
          className="h-[2px] w-0 rounded-full bg-wandor-accent transition-all duration-300 group-hover:w-5 group-hover:ml-2"
        />
      </button>

      {RAIL_SECTIONS.map((s) => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            aria-label={s.id}
            onClick={() =>
              document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" })
            }
            className="group flex items-center bg-transparent border border-transparent rounded-full p-1.5 cursor-pointer transition-all duration-300 hover:bg-black/85 hover:border-white/15 hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
          >
            <span
              aria-hidden="true"
              className={`h-[2px] rounded-full bg-wandor-accent transition-all duration-300 ${
                isActive ? "w-6 mr-2" : "w-0 group-hover:w-5 group-hover:mr-2"
              }`}
            />
            <span
              className={`stamp-label text-[10px] font-semibold uppercase max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 overflow-hidden whitespace-nowrap transition-all duration-300 group-hover:mr-2.5 text-wandor-accent`}
            >
              {s.id}
            </span>
            <span
              className={`tnum transition-all duration-300 ${
                isActive
                  ? "text-wandor-accent text-lg font-bold"
                  : "text-white/40 text-xs font-semibold group-hover:text-wandor-accent"
              }`}
            >
              {s.num}
            </span>
            <span
              aria-hidden="true"
              className={`h-[2px] rounded-full bg-wandor-accent transition-all duration-300 ${
                isActive ? "w-6 ml-2" : "w-0 group-hover:w-5 group-hover:ml-2"
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}
