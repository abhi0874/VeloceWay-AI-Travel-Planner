import { useRef, type PointerEvent, type ReactNode } from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxDeg?: number;
}

/**
 * Subtle 3D tilt + glare on pointer move — used for destination "stamps".
 * Disabled automatically for touch pointers and reduced-motion users.
 */
export default function TiltCard({ children, className = "", maxDeg = 7 }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const shouldTilt = () =>
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!shouldTilt()) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (py - 0.5) * -2 * maxDeg;
    const ry = (px - 0.5) * 2 * maxDeg;
    el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
  };

  const handleLeave = () => {
    const el = cardRef.current;
    if (el) el.style.transform = "";
  };

  return (
    <div className={`tilt-wrap ${className}`}>
      <div
        ref={cardRef}
        className="tilt-card"
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
      >
        {children}
        <span className="glare" aria-hidden="true" />
      </div>
    </div>
  );
}
