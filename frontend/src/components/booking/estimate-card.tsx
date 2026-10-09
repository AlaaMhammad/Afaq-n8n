"use client";

import { AlertTriangle, Calculator, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn, formatUsd } from "@/lib/utils";
import type { EstimateState } from "./use-live-estimate";

/** The live indicative estimate, always labelled as indicative. */
export function EstimateCard({ state, className }: { state: EstimateState; className?: string }) {
  const t = useTranslations("booking.estimate");
  const locale = useLocale();
  const estimate = state.estimate;

  return (
    <div className={cn("rounded-xl border border-pulse/30 bg-pulse/5 p-4", className)} aria-live="polite" data-testid="estimate">
      <p className="flex items-center gap-2 text-xs font-semibold text-pulse">
        <Calculator className="size-3.5" aria-hidden />
        {t("title")}
        {state.status === "loading" && <Loader2 className="size-3.5 animate-spin" aria-label={t("calculating")} />}
      </p>

      {state.status === "error" ? (
        <p className="mt-2 text-sm text-muted">{t("unavailable")}</p>
      ) : estimate ? (
        <div className={cn("transition-opacity", state.status === "loading" && "opacity-60")}>
          <p className="mt-2 font-mono text-2xl font-bold">
            <bdi dir="ltr">
              {formatUsd(estimate.min, locale)} – {formatUsd(estimate.max, locale)}
            </bdi>
          </p>
          <p className="mt-0.5 text-sm text-muted">{t("weeks", { min: estimate.weeks[0], max: estimate.weeks[1] })}</p>
          {estimate.exceeds_budget && (
            <p className="mt-3 flex gap-2 rounded-lg bg-accent/10 p-2.5 text-xs text-foreground">
              <AlertTriangle className="mt-px size-3.5 shrink-0 text-accent" aria-hidden />
              {t("exceedsBudget")}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 h-8 w-40 animate-pulse rounded-md bg-surface-2" aria-hidden />
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted">{t("indicative")}</p>
    </div>
  );
}
