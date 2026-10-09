import { ArrowLeft, ArrowRight, Bot } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Project } from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { AskCopilotButton, HeroPrompts } from "./hero-prompts";
import { HeroVisual } from "./hero-visual";

/**
 * Hero: status badge, headline, CTAs, "try asking" prompts that drive the AI → 3D bridge,
 * live totals from the portfolio, and the interactive 3D automation core.
 */
export function HeroSection({ projects }: { projects: Project[] | null }) {
  const t = useTranslations("hero");
  const locale = useLocale();
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  const stats =
    projects && projects.length > 0
      ? [
          { label: t("stats.workflows"), value: formatNumber(projects.length, locale) },
          { label: t("stats.runs"), value: formatNumber(projects.reduce((sum, p) => sum + p.metrics.monthlyRuns, 0), locale, { notation: "compact" }) },
          { label: t("stats.hours"), value: formatNumber(projects.reduce((sum, p) => sum + p.metrics.hoursSavedPerMonth, 0), locale) },
        ]
      : [];

  return (
    <section id="hero" aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 60%)" }}
        aria-hidden
      />
      <Container className="relative grid min-h-[calc(100dvh-4rem)] items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="max-w-2xl">
          <Badge variant="pulse" className="mb-6">
            <span className="size-2 animate-pulse-ring rounded-full bg-pulse shadow-glow-pulse" aria-hidden />
            {t("badge")}
          </Badge>
          <h1 id="hero-heading" className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted">{t("subtitle")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#order">
                {t("primaryCta")}
                <Arrow />
              </a>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href="#portfolio">{t("secondaryCta")}</a>
            </Button>
            <AskCopilotButton size="lg" variant="ghost" className="border border-pulse/40 text-pulse hover:bg-pulse/10">
              <Bot /> {t("askCopilot")}
            </AskCopilotButton>
          </div>

          <HeroPrompts />

          {stats.length > 0 && (
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs text-muted">{stat.label}</dt>
                  <dd className="mt-1 font-mono text-2xl font-bold text-foreground">
                    <bdi dir="ltr">{stat.value}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <HeroVisual />
      </Container>
    </section>
  );
}
