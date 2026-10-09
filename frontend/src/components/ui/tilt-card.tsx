"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

const MAX_TILT_DEG = 8;

/**
 * A card that tilts toward the pointer in 3D with a moving glare. Mouse/pen only — touch keeps
 * normal scrolling — and disabled under prefers-reduced-motion (the CSS ignores the variables).
 * Writes CSS variables directly, so moving the pointer never re-renders React.
 */
export function TiltCard({ className, children, ...props }: React.ComponentProps<"div">) {
  const card = useRef<HTMLDivElement>(null);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = card.current;
    if (!element || event.pointerType === "touch") return;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width; // 0 → 1
    const y = (event.clientY - rect.top) / rect.height;
    element.style.setProperty("--tilt-x", `${((0.5 - y) * MAX_TILT_DEG * 2).toFixed(2)}deg`);
    element.style.setProperty("--tilt-y", `${((x - 0.5) * MAX_TILT_DEG * 2).toFixed(2)}deg`);
    element.style.setProperty("--glare-x", `${(x * 100).toFixed(1)}%`);
    element.style.setProperty("--glare-y", `${(y * 100).toFixed(1)}%`);
    element.dataset.tilting = "true";
  };

  const onPointerLeave = () => {
    const element = card.current;
    if (!element) return;
    element.style.setProperty("--tilt-x", "0deg");
    element.style.setProperty("--tilt-y", "0deg");
    delete element.dataset.tilting;
  };

  return (
    <div className="h-full [perspective:900px]">
      <div
        ref={card}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className={cn("tilt-card relative h-full rounded-2xl border border-border bg-surface/80 p-6 shadow-sm transition-colors hover:border-pulse/50", className)}
        {...props}
      >
        {children}
        <span className="tilt-glare pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden />
      </div>
    </div>
  );
}
