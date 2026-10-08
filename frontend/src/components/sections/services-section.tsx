import { useLocale, useTranslations } from "next-intl";
import type { Service } from "@/lib/api/types";
import { formatUsd } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceIcon } from "@/components/ui/icons";
import { SectionShell } from "@/components/layout/section-shell";
import { RequestServiceButton } from "./request-service-button";
import { SectionUnavailable } from "./section-unavailable";

export function ServicesSection({ services }: { services: Service[] | null }) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <SectionShell id="services" eyebrow={t("services.eyebrow")} title={t("services.title")} subtitle={t("services.subtitle")}>
      {services === null ? (
        <SectionUnavailable />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li key={service.id}>
              <Card className="group flex h-full flex-col hover:border-accent/50">
                <CardHeader>
                  <span className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-shadow group-hover:shadow-glow-accent">
                    <ServiceIcon name={service.icon} className="size-5" />
                  </span>
                  <CardTitle>{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <ul className="flex flex-wrap gap-2">
                  {service.features.slice(0, 3).map((feature) => (
                    <li key={feature}>
                      <Badge className="whitespace-normal text-start">{feature}</Badge>
                    </li>
                  ))}
                </ul>
                <CardFooter className="mt-auto justify-between pt-6">
                  {service.starting_price !== null && (
                    <span className="text-sm text-muted">
                      {t("common.startingFrom")}{" "}
                      {/* isolated LTR run so "$1,500" isn't reordered inside Arabic text */}
                      <bdi dir="ltr" className="font-mono font-semibold text-foreground">
                        {formatUsd(service.starting_price, locale)}
                      </bdi>
                    </span>
                  )}
                  <RequestServiceButton serviceSlug={service.slug} />
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}
