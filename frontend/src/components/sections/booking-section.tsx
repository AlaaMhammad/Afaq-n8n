import { MessageSquareMore } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { SectionShell } from "@/components/layout/section-shell";

/** Booking placeholder — the multi-step form (validation, live estimate) arrives in Phase 6. */
export function BookingSection() {
  const t = useTranslations("booking");

  return (
    <SectionShell id="order" eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")}>
      <Card className="flex items-start gap-4 border-dashed">
        <MessageSquareMore className="mt-0.5 size-5 shrink-0 text-pulse" aria-hidden />
        <p className="text-sm leading-relaxed text-muted">{t("formComingSoon")}</p>
      </Card>
    </SectionShell>
  );
}
