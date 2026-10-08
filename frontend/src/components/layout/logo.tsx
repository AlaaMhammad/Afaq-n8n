import { cn } from "@/lib/utils";

/** Wordmark: orbiting "horizon" glyph + bilingual name. */
export function Logo({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-bold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <circle cx="16" cy="16" r="13" fill="none" stroke="var(--pulse)" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.7" />
        <path d="M5 19c3.5-6 7.2-9 11-9s7.5 3 11 9" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="16" cy="10" r="2.6" fill="var(--accent)" />
      </svg>
      <span className="text-base">{label}</span>
    </span>
  );
}
