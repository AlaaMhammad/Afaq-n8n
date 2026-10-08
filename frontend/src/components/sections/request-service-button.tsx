"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { scrollToSection } from "@/lib/scroll";
import { useUiStore } from "@/stores/ui-store";

/** Prefills the booking form with this service and scrolls to it. */
export function RequestServiceButton({ serviceSlug }: { serviceSlug: string }) {
  const t = useTranslations("services");

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        useUiStore.getState().prefillBooking({ serviceSlug });
        void scrollToSection("order");
      }}
    >
      {t("request")}
    </Button>
  );
}
