import * as React from "react";
import type { SectionId } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Container } from "./container";

interface SectionShellProps extends Omit<React.ComponentProps<"section">, "id" | "title"> {
  id: SectionId;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

/**
 * Standard page section: anchor id (navigation + AI `navigate_to`), heading block, content.
 * `aria-labelledby` ties the region to its heading for screen readers.
 */
export function SectionShell({ id, eyebrow, title, subtitle, className, children, ...props }: SectionShellProps) {
  const headingId = `${id}-heading`;

  return (
    <section id={id} aria-labelledby={title ? headingId : undefined} className={cn("relative py-20 sm:py-28", className)} {...props}>
      <Container>
        {title && (
          <header className="mb-12 max-w-3xl">
            {eyebrow && <p className="mb-3 text-xs font-semibold text-accent ltr:font-mono ltr:uppercase ltr:tracking-[0.2em]">{eyebrow}</p>}
            <h2 id={headingId} className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h2>
            {subtitle && <p className="mt-4 text-pretty text-base leading-relaxed text-muted sm:text-lg">{subtitle}</p>}
          </header>
        )}
        {children}
      </Container>
    </section>
  );
}
