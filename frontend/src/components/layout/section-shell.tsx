import * as React from "react";
import type { SectionId } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Container } from "./container";

interface SectionShellProps extends Omit<React.ComponentProps<"section">, "id" | "title"> {
  id: SectionId;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Decorative 3D vignette beside the heading on wide screens (a StageSlot). */
  visual?: React.ReactNode;
}

/**
 * Standard page section: anchor id (navigation + AI `navigate_to`), heading block, content.
 * `aria-labelledby` ties the region to its heading for screen readers.
 */
export function SectionShell({ id, eyebrow, title, subtitle, visual, className, children, ...props }: SectionShellProps) {
  const headingId = `${id}-heading`;

  return (
    <section id={id} aria-labelledby={title ? headingId : undefined} className={cn("relative py-20 sm:py-28", className)} {...props}>
      <Container>
        {title && (
          <div className={cn("mb-12", visual && "md:grid md:grid-cols-[minmax(0,1fr)_minmax(16rem,26rem)] md:items-center md:gap-10")}>
            <header className="max-w-3xl">
              {eyebrow && <p className="mb-3 text-xs font-semibold text-accent ltr:font-mono ltr:uppercase ltr:tracking-[0.2em]">{eyebrow}</p>}
              <h2 id={headingId} className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h2>
              {subtitle && <p className="mt-4 text-pretty text-base leading-relaxed text-muted sm:text-lg">{subtitle}</p>}
            </header>
            {visual && <div className="hidden md:block">{visual}</div>}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}
