import { useTranslations } from "next-intl";
import type { Service } from "@/lib/api/types";
import { SectionShell } from "@/components/layout/section-shell";
import { BookingForm } from "@/components/booking/booking-form";

/** Multi-step booking & live estimator. Works without the services list (the visitor picks "not sure"). */
export function BookingSection({ services }: { services: Service[] | null }) {
  const t = useTranslations("booking");

  return (
    <SectionShell id="order" eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")}>
      <BookingForm services={services ?? []} />
    </SectionShell>
  );
}
