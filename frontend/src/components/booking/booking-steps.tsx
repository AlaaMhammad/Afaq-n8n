"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { HelpCircle, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Service } from "@/lib/api/types";
import { BUDGET_RANGES, COMPLEXITY_LEVELS, TIMELINES, type BookingField, type BookingInput } from "@/lib/booking/schema";
import { cn, formatUsd } from "@/lib/utils";
import { Input, Textarea } from "@/components/ui/input";
import { ServiceIcon } from "@/components/ui/icons";

/** Inline field error, linked to its input with aria-describedby. */
export function FieldError({ name }: { name: BookingField }) {
  const t = useTranslations("booking.validation");
  const { formState } = useFormContext<BookingInput>();
  const message = formState.errors[name]?.message;
  if (!message) return null;
  // Client messages are i18n keys; server (422) messages arrive already localized.
  const known = t.has(message as "nameMin");
  return (
    <p id={`${name}-error`} role="alert" className="mt-1.5 text-xs text-danger">
      {known ? t(message as "nameMin") : message}
    </p>
  );
}

const optionCard =
  "flex cursor-pointer gap-3 rounded-xl border border-border bg-surface-2/50 p-4 text-start transition-colors hover:border-pulse/50 has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pulse";

export function ServiceStep({ services }: { services: Service[] }) {
  const t = useTranslations("booking.service");
  const locale = useLocale();
  const { register } = useFormContext<BookingInput>();

  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("heading")}>
      {services.map((service) => (
        <label key={service.slug} className={optionCard}>
          <input type="radio" value={service.slug} {...register("service_slug")} className="sr-only" />
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
            <ServiceIcon name={service.icon} className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{service.title}</span>
            {service.starting_price !== null && (
              <span className="mt-0.5 block text-xs text-muted">
                <bdi dir="ltr" className="font-mono">
                  {formatUsd(service.starting_price, locale)}+
                </bdi>
              </span>
            )}
          </span>
        </label>
      ))}
      <label className={cn(optionCard, "sm:col-span-2")}>
        <input type="radio" value="" {...register("service_slug")} className="sr-only" />
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-pulse/10 text-pulse">
          <HelpCircle className="size-4" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-semibold">{t("notSure")}</span>
          <span className="mt-0.5 block text-xs text-muted">{t("notSureHint")}</span>
        </span>
      </label>
    </div>
  );
}

export function ScopeStep() {
  const t = useTranslations("booking");
  const { register, control, formState } = useFormContext<BookingInput>();
  const requirements = useWatch({ control, name: "requirements" }) ?? "";
  const complexity = useWatch({ control, name: "complexity" }) ?? 3;

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="requirements" className="text-sm font-medium">
          {t("scope.requirements")}
        </label>
        <Textarea
          id="requirements"
          rows={5}
          maxLength={5000}
          placeholder={t("scope.requirementsHint")}
          aria-invalid={Boolean(formState.errors.requirements) || undefined}
          aria-describedby="requirements-error requirements-count"
          className="mt-2"
          {...register("requirements")}
        />
        <div className="flex justify-between gap-3">
          <FieldError name="requirements" />
          <bdi id="requirements-count" dir="ltr" className={cn("ms-auto mt-1.5 font-mono text-[11px]", requirements.trim().length < 20 ? "text-muted" : "text-success")}>
            {requirements.trim().length} / 20+
          </bdi>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="complexity" className="text-sm font-medium">
            {t("scope.complexity")}
          </label>
          <span className="text-sm font-semibold text-accent" aria-hidden>
            {t(`scope.complexityLevels.${complexity as 1}`)}
          </span>
        </div>
        <input
          id="complexity"
          type="range"
          min={1}
          max={5}
          step={1}
          aria-valuetext={t(`scope.complexityLevels.${complexity as 1}`)}
          className="mt-3 w-full accent-[var(--accent)]"
          {...register("complexity", { valueAsNumber: true })}
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted" aria-hidden>
          {COMPLEXITY_LEVELS.map((level) => (
            <span key={level}>{t(`scope.complexityLevels.${level}`)}</span>
          ))}
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">{t("scope.timeline")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIMELINES.map((timeline) => (
            <label
              key={timeline}
              className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-pulse/50 has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pulse"
            >
              <input type="radio" value={timeline} {...register("timeline")} className="sr-only" />
              {t(`timelines.${timeline}`)}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export function BudgetStep({ estimate }: { estimate: React.ReactNode }) {
  const t = useTranslations("booking");
  const { register } = useFormContext<BookingInput>();

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t("budget.heading")} aria-describedby="budget_range-error">
        {BUDGET_RANGES.map((range) => (
          <label key={range} className={cn(optionCard, "items-center py-3")}>
            <input type="radio" value={range} {...register("budget_range")} className="sr-only" />
            <span className="size-4 shrink-0 rounded-full border-2 border-border [label:has(:checked)_&]:border-[5px] [label:has(:checked)_&]:border-accent" aria-hidden />
            <bdi className="text-sm font-semibold">{t(`budgets.${range}`)}</bdi>
          </label>
        ))}
      </div>
      <FieldError name="budget_range" />
      {/* On large screens the estimate lives in the sticky side summary instead. */}
      <div className="lg:hidden">{estimate}</div>
    </div>
  );
}

export function ContactStep() {
  const t = useTranslations("booking.contact");
  const { register, formState } = useFormContext<BookingInput>();
  const fields = [
    { name: "client_name", label: t("name"), type: "text", autoComplete: "name", required: true },
    { name: "client_email", label: t("email"), type: "email", autoComplete: "email", inputMode: "email", dir: "ltr", required: true },
    { name: "client_phone", label: t("phone"), type: "tel", autoComplete: "tel", inputMode: "tel", dir: "ltr", required: false },
    { name: "company", label: t("company"), type: "text", autoComplete: "organization", required: false },
  ] as const;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="text-sm font-medium">
            {field.label}
            {!field.required && <span className="ms-1.5 text-xs font-normal text-muted">({t("optional")})</span>}
          </label>
          <Input
            id={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            inputMode={"inputMode" in field ? field.inputMode : undefined}
            dir={"dir" in field ? field.dir : "auto"}
            aria-invalid={Boolean(formState.errors[field.name]) || undefined}
            aria-describedby={`${field.name}-error`}
            aria-required={field.required || undefined}
            className="mt-2"
            {...register(field.name)}
          />
          <FieldError name={field.name} />
        </div>
      ))}
    </div>
  );
}

export function ReviewStep({ services, onEdit }: { services: Service[]; onEdit: (step: number) => void }) {
  const t = useTranslations("booking");
  const { register, control, formState } = useFormContext<BookingInput>();
  const values = useWatch({ control }) as BookingInput;
  const service = services.find((s) => s.slug === values.service_slug);
  const notSet = t("review.notSet");

  const rows: { step: number; label: string; value: React.ReactNode }[] = [
    { step: 0, label: t("steps.service"), value: service?.title ?? t("service.notSure") },
    {
      step: 1,
      label: t("steps.scope"),
      value: (
        <>
          <span className="block">
            {t(`scope.complexityLevels.${(values.complexity ?? 3) as 1}`)} · {values.timeline ? t(`timelines.${values.timeline}`) : notSet}
          </span>
          <span className="mt-1 line-clamp-3 block whitespace-pre-wrap text-muted" dir="auto">
            {values.requirements}
          </span>
        </>
      ),
    },
    { step: 2, label: t("steps.budget"), value: values.budget_range ? <bdi>{t(`budgets.${values.budget_range}`)}</bdi> : notSet },
    {
      step: 3,
      label: t("steps.contact"),
      value: (
        <span dir="auto">
          {values.client_name} · <bdi dir="ltr">{values.client_email}</bdi>
          {values.client_phone && (
            <>
              {" "}
              · <bdi dir="ltr">{values.client_phone}</bdi>
            </>
          )}
          {values.company && <> · {values.company}</>}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <dl className="divide-y divide-border rounded-xl border border-border">
        {rows.map((row) => (
          <div key={row.step} className="flex gap-4 p-4">
            <dt className="w-24 shrink-0 text-xs font-semibold text-muted">{row.label}</dt>
            <dd className="min-w-0 flex-1 text-sm">{row.value}</dd>
            <button type="button" onClick={() => onEdit(row.step)} className="inline-flex shrink-0 items-center gap-1 self-start text-xs font-semibold text-pulse hover:underline">
              <Pencil className="size-3" aria-hidden /> {t("review.edit")}
            </button>
          </div>
        ))}
      </dl>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
            aria-invalid={Boolean(formState.errors.consent) || undefined}
            aria-describedby="consent-error"
            {...register("consent")}
          />
          <span className="leading-relaxed text-muted">{t("review.consent")}</span>
        </label>
        <FieldError name="consent" />
      </div>

      {/* Honeypot: off-screen and out of the tab order; people never see or fill it. */}
      <div aria-hidden className="absolute -start-[9999px] size-px overflow-hidden">
        <label htmlFor="website">{t("honeypot")}</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>
    </div>
  );
}
