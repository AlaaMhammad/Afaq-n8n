import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

/** Hero: status badge, headline, dual CTAs. The ambient 3D "automation core" mounts here in Phase 5. */
export function HeroSection() {
  const t = useTranslations("hero");
  const Arrow = useLocale() === "ar" ? ArrowLeft : ArrowRight;

  return (
    <section id="hero" aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 60%)" }}
        aria-hidden
      />
      <Container className="relative grid min-h-[calc(100dvh-4rem)] items-center gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr]">
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
          </div>
        </div>

        {/* Placeholder for the R3F AutomationCore (Phase 5) */}
        <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block" aria-hidden>
          <div className="absolute inset-0 rounded-full border border-pulse/20" />
          <div className="absolute inset-10 rounded-full border border-dashed border-accent/30" />
          <div className="absolute inset-24 rounded-full bg-accent/10 shadow-glow-accent" />
          <div className="absolute inset-[38%] animate-pulse-ring rounded-full bg-accent shadow-glow-accent" />
        </div>
      </Container>
    </section>
  );
}
