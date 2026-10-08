import { CloudOff } from "lucide-react";
import { useTranslations } from "next-intl";

/** Shown when the API could not be reached while rendering a section. */
export function SectionUnavailable() {
  const t = useTranslations("common");
  return (
    <div role="status" className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
      <CloudOff className="size-5 shrink-0" aria-hidden />
      {t("dataUnavailable")}
    </div>
  );
}
