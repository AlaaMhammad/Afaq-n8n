import { useLocale, useTranslations } from "next-intl";
import type { Service } from "@/lib/api/types";
import { SectionShell } from "@/components/layout/section-shell";
import { BookingForm } from "@/components/booking/booking-form";
import { StageSlot } from "@/components/stage/stage-slot";

/**
 * Multi-step booking & live estimator, beside a 3D node terminal into which the chosen service
 * snaps as the visitor moves through the steps. Works without the services list ("not sure").
 */
export function BookingSection({ services }: { services: Service[] | null }) {
  const t = useTranslations("booking");
  const locale = useLocale() as "ar" | "en";
  const terminal = { services: (services ?? []).map(({ slug, title }) => ({ slug, title })), customLabel: t("customCartridge") };

  return (
    <SectionShell
      id="order"
      eyebrow={t("eyebrow")}
      title={t("title")}
      subtitle={t("subtitle")}
      visual={<StageSlot scene="booking" locale={locale} data={terminal} label={t("terminalLabel")} className="h-64 lg:h-72" />}
    >
      <BookingForm services={services ?? []} />
    </SectionShell>
  );
}
