"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, Copy, Mail, PhoneCall, Search, FileSignature } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ServiceRequestCreated } from "@/lib/api/types";
import { CONTACT_EMAIL } from "@/lib/contact";
import { formatUsd } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Confirmation: reference (copyable), estimate recap and what happens next. */
export function BookingSuccess({ result, onReset }: { result: ServiceRequestCreated; onReset: () => void }) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => heading.current?.focus(), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the reference stays visible and selectable.
    }
  };

  const steps = [
    { icon: Search, text: t("success.next.review") },
    { icon: PhoneCall, text: t("success.next.call") },
    { icon: FileSignature, text: t("success.next.proposal") },
  ];

  return (
    <div className="mx-auto max-w-xl py-4 text-center" data-testid="booking-success">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/15 text-success shadow-[0_0_40px_-8px] shadow-success motion-safe:animate-pop">
        <CheckCircle2 className="size-8" aria-hidden />
      </span>
      <h3 ref={heading} tabIndex={-1} className="mt-5 text-2xl font-bold outline-none">
        {t("success.title")}
      </h3>

      <p className="mt-4 text-sm text-muted">{t("success.reference")}</p>
      <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2">
        <bdi dir="ltr" className="select-all font-mono text-xl font-bold tracking-wider" data-testid="booking-reference">
          {result.reference}
        </bdi>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-pulse hover:bg-pulse/10" aria-live="polite">
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? t("success.copied") : t("success.copy")}
        </button>
      </div>

      {result.estimate && (
        <p className="mt-4 text-sm text-muted">
          {t("success.estimate", {
            range: `${formatUsd(result.estimate.min, locale)} – ${formatUsd(result.estimate.max, locale)}`,
            weeks: t("estimate.weeks", { min: result.estimate.weeks[0], max: result.estimate.weeks[1] }),
          })}
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-border p-5 text-start">
        <h4 className="text-sm font-semibold">{t("success.nextTitle")}</h4>
        <ol className="mt-4 space-y-4">
          {steps.map(({ icon: Icon, text }, index) => (
            <li key={text} className="flex items-center gap-3 text-sm">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-pulse/10 text-pulse">
                <Icon className="size-4" aria-hidden />
              </span>
              <span>
                <span className="me-1.5 font-mono text-xs text-muted">{index + 1}.</span>
                {text}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button variant="secondary" onClick={onReset}>
          {t("success.another")}
        </Button>
        <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-1.5 text-sm text-pulse hover:underline">
          <Mail className="size-4" aria-hidden />
          {t("success.talk", { email: CONTACT_EMAIL })}
        </a>
      </div>
    </div>
  );
}
