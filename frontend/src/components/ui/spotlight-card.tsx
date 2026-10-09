"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Card with a soft radial "spotlight" that follows the pointer (CSS variables only — no React
 * render per move). Touch and keyboard users simply see the static card.
 */
export function SpotlightCard({ className, children, ...props }: React.ComponentProps<"div">) {
  const card = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={card}
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse" || !card.current) return;
        const rect = card.current.getBoundingClientRect();
        card.current.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
        card.current.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
      }}
      className={cn(
        "group/spot relative isolate overflow-hidden rounded-2xl border border-border bg-surface/80 p-6 transition-colors hover:border-accent/50",
        "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
        "before:bg-[radial-gradient(420px_circle_at_var(--spot-x,50%)_var(--spot-y,0%),color-mix(in_oklab,var(--accent)_16%,transparent),transparent_70%)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
