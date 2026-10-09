import { Bot, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Service } from "@/lib/api/types";
import { bentoSpans } from "@/lib/bento";
import { cn, formatUsd } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ServiceIcon } from "@/components/ui/icons";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { SectionShell } from "@/components/layout/section-shell";
import { AskCopilotButton } from "./hero-prompts";
import { RequestServiceButton } from "./request-service-button";
import { SectionUnavailable } from "./section-unavailable";

const COL_SPAN = { 1: "lg:col-span-1", 2: "lg:col-span-2", 3: "lg:col-span-3" } as const;
const ROW_SPAN = { 1: "lg:row-span-1", 2: "lg:row-span-2" } as const;

/**
 * Services as a bento grid: the first service is a 2×2 feature tile with every feature listed,
 * the others are compact, and a final tile hands custom needs to the Copilot.
 */
export function ServicesSection({ services }: { services: Service[] | null }) {
  const t = useTranslations();
  const locale = useLocale();

  if (services === null) {
    return (
      <SectionShell id="services" eyebrow={t("services.eyebrow")} title={t("services.title")} subtitle={t("services.subtitle")}>
        <SectionUnavailable />
      </SectionShell>
    );
  }

  const spans = bentoSpans(services.length + 1);

  return (
    <SectionShell id="services" eyebrow={t("services.eyebrow")} title={t("services.title")} subtitle={t("services.subtitle")}>
      <ul className="grid auto-rows-[minmax(15rem,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => {
          const featured = index === 0;
          const span = spans[index];
          return (
            <li key={service.id} className={cn(COL_SPAN[span.col], ROW_SPAN[span.row], featured && "sm:col-span-2")}>
              <SpotlightCard className={cn("flex h-full flex-col", featured && "bg-gradient-to-br from-accent/10 via-surface/80 to-surface/80 sm:p-8")}>
                <span
                  className={cn(
                    "mb-4 inline-flex items-center justify-center rounded-xl bg-accent/10 text-accent transition-shadow group-hover/spot:shadow-glow-accent",
                    featured ? "size-14" : "size-11",
                  )}
                >
                  <ServiceIcon name={service.icon} className={featured ? "size-7" : "size-5"} />
                </span>
                <h3 className={cn("font-semibold leading-snug", featured ? "text-2xl" : "text-lg")}>{service.title}</h3>
                <p className={cn("mt-2 leading-relaxed text-muted", featured ? "max-w-xl text-base" : "text-sm")}>{service.description}</p>

                {featured ? (
                  <div className="mt-6">
                    <p className="text-xs font-semibold text-muted">{t("services.included")}</p>
                    <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      {service.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {service.features.slice(0, span.col > 1 ? 4 : 3).map((feature) => (
                      <li key={feature}>
                        <Badge className="whitespace-normal text-start">{feature}</Badge>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
                  {service.starting_price !== null && (
                    <span className="text-sm text-muted">
                      {t("common.startingFrom")}{" "}
                      {/* isolated LTR run so "$1,500" isn't reordered inside Arabic text */}
                      <bdi dir="ltr" className={cn("font-mono font-semibold text-foreground", featured && "text-lg")}>
                        {formatUsd(service.starting_price, locale)}
                      </bdi>
                    </span>
                  )}
                  <RequestServiceButton serviceSlug={service.slug} />
                </div>
              </SpotlightCard>
            </li>
          );
        })}

        {/* On 2-column tablets the featured tile spans both columns; widen this one too if it would leave a hole. */}
        <li className={cn(COL_SPAN[spans[services.length].col], ROW_SPAN[spans[services.length].row], (services.length - 1) % 2 === 0 && "sm:col-span-2")}>
          <SpotlightCard className="flex h-full flex-col border-dashed border-pulse/40 bg-pulse/5 hover:border-pulse/70">
            <span className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-pulse/15 text-pulse">
              <Bot className="size-5" aria-hidden />
            </span>
            <h3 className="text-lg font-semibold">{t("services.customTitle")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t("services.customBody")}</p>
            <div className="mt-auto pt-6">
              <AskCopilotButton prompt={t("services.customPrompt")} variant="ghost" size="sm" className="border border-pulse/40 text-pulse hover:bg-pulse/10">
                <Bot /> {t("services.customCta")}
              </AskCopilotButton>
            </div>
          </SpotlightCard>
        </li>
      </ul>
    </SectionShell>
  );
}
