"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { submitServiceRequest } from "@/lib/api/booking";
import { ApiError } from "@/lib/api/client";
import type { Service, ServiceRequestCreated } from "@/lib/api/types";
import {
  BOOKING_DEFAULTS,
  BOOKING_STEPS,
  bookingSchema,
  firstStepWithError,
  readUtm,
  toServiceRequest,
  type BookingField,
  type BookingInput,
  type BookingValues,
} from "@/lib/booking/schema";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { BookingSuccess } from "./booking-success";
import { BudgetStep, ContactStep, ReviewStep, ScopeStep, ServiceStep } from "./booking-steps";
import { EstimateCard } from "./estimate-card";
import { useLiveEstimate } from "./use-live-estimate";

export const DRAFT_KEY = "afaq-booking-draft";

type Banner = { kind: "error" | "info"; text: string } | null;

interface Draft {
  step: number;
  values: Partial<BookingInput>;
}

function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

/**
 * Multi-step booking & estimator (docs/04_features/service_request.md): one react-hook-form
 * instance across five steps, per-step validation, a live estimate, a sessionStorage draft,
 * prefill from service cards, and API errors mapped back onto the fields they belong to.
 * A successful submission is stored by Laravel and announced to n8n by a signed webhook.
 */
export function BookingForm({ services }: { services: Service[] }) {
  const t = useTranslations("booking");
  const locale = useLocale() as "ar" | "en";
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [banner, setBanner] = useState<Banner>(null);
  const [result, setResult] = useState<ServiceRequestCreated | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const form = useForm<BookingInput, unknown, BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: BOOKING_DEFAULTS,
    mode: "onTouched",
  });
  const { control, handleSubmit, trigger, reset, setValue, setError, formState } = form;

  const [service_slug, complexity, timeline, budget_range] = useWatch({ control, name: ["service_slug", "complexity", "timeline", "budget_range"] });
  const estimate = useLiveEstimate({ service_slug: service_slug ?? "", complexity: Number(complexity) || 3, timeline: timeline ?? "1_3_months", budget_range });
  const estimateCard = <EstimateCard state={estimate} />;

  const goTo = useCallback((next: number) => {
    moved.current = true;
    setStep(next);
    setFurthest((value) => Math.max(value, next));
  }, []);

  // Move focus to the new step's heading and keep the form in view (not on first render).
  useEffect(() => {
    if (!moved.current) return;
    stepHeading.current?.focus({ preventScroll: true });
    const top = root.current?.getBoundingClientRect().top ?? 0;
    if (top < 0 || top > window.innerHeight * 0.6) root.current?.scrollIntoView({ block: "start" });
  }, [step, result]);

  // Restore an unsent draft from this tab's session.
  useEffect(() => {
    const draft = readDraft();
    if (!draft) return;
    reset({ ...BOOKING_DEFAULTS, ...draft.values, consent: false, website: "" });
    const restoredStep = Math.min(Math.max(draft.step, 0), BOOKING_STEPS.length - 1);
    // Deferred: never set state synchronously inside an effect body.
    const timer = setTimeout(() => {
      setStep(restoredStep);
      setFurthest(restoredStep);
      if (restoredStep > 0 || draft.values.requirements) setBanner({ kind: "info", text: t("draftRestored") });
    }, 0);
    return () => clearTimeout(timer);
  }, [reset, t]);

  // Save the draft as the visitor types (never the consent or the honeypot).
  const { subscribe, getValues } = form;
  useEffect(() => {
    if (result) return;
    const save = (values: Partial<BookingInput>) => {
      const draft: Draft = { step, values: { ...values, consent: undefined, website: undefined } };
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // storage full or blocked — the form still works
      }
    };
    if (moved.current) save(getValues()); // remember the step even if nothing was typed on it
    return subscribe({ formState: { values: true }, callback: ({ values }) => save(values) });
  }, [subscribe, getValues, step, result]);

  // "Request this service" on a card (or the agent) prefills the service and skips to scope.
  const prefill = useUiStore((s) => s.bookingPrefill);
  useEffect(() => {
    if (!prefill) return;
    const timer = setTimeout(() => {
      if (result) {
        setResult(null);
        reset(BOOKING_DEFAULTS);
      }
      if (prefill.serviceSlug !== undefined) setValue("service_slug", prefill.serviceSlug, { shouldDirty: true });
      if (prefill.budgetRange) setValue("budget_range", prefill.budgetRange, { shouldDirty: true });
      if (prefill.timeline) setValue("timeline", prefill.timeline, { shouldDirty: true });
      if (prefill.requirements) setValue("requirements", prefill.requirements, { shouldDirty: true });
      setBanner(null);
      goTo(1);
      useUiStore.getState().prefillBooking(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [prefill, result, reset, setValue, goTo]);

  const next = async () => {
    const valid = await trigger([...BOOKING_STEPS[step].fields] as BookingField[], { shouldFocus: true });
    if (valid) goTo(step + 1);
  };

  const onSubmit = async (values: BookingValues) => {
    setBanner(null);
    try {
      const created = await submitServiceRequest(toServiceRequest(values, locale, readUtm(window.location.search)));
      sessionStorage.removeItem(DRAFT_KEY);
      setResult(created);
      moved.current = true;
      toast.success(t("success.title"));
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setBanner({ kind: "error", text: t("errors.generic") });
        return;
      }
      const problem = error.problem;
      if (problem.code === "VALIDATION_FAILED" && problem.errors) {
        const fields = Object.keys(problem.errors);
        for (const [field, messages] of Object.entries(problem.errors)) {
          setError(field as BookingField, { type: "server", message: messages[0] });
        }
        goTo(firstStepWithError(fields));
        setBanner({ kind: "error", text: t("errors.validation") });
      } else if (problem.code === "CONFLICT") {
        setBanner({ kind: "error", text: t("errors.duplicate", { reference: problem.reference ?? "—" }) });
      } else if (problem.code === "RATE_LIMITED") {
        setBanner({ kind: "error", text: t("errors.rateLimited", { seconds: problem.retry_after ?? 60 }) });
      } else if (problem.code === "NETWORK_ERROR") {
        setBanner({ kind: "error", text: t("errors.network") });
      } else {
        setBanner({ kind: "error", text: t("errors.generic") });
      }
    }
  };

  const startOver = () => {
    reset(BOOKING_DEFAULTS);
    setResult(null);
    setBanner(null);
    setStep(0);
    setFurthest(0);
    moved.current = true;
  };

  if (result) {
    return (
      <div ref={root} className="scroll-mt-24 rounded-3xl border border-border bg-surface/70 p-6 sm:p-10">
        <BookingSuccess result={result} onReset={startOver} />
      </div>
    );
  }

  const current = BOOKING_STEPS[step];
  const isLast = step === BOOKING_STEPS.length - 1;
  const selectedService = services.find((s) => s.slug === service_slug);
  const Back = locale === "ar" ? ArrowRight : ArrowLeft;
  const Forward = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <FormProvider {...form}>
      <div ref={root} className="grid scroll-mt-24 gap-6 lg:grid-cols-[1fr_20rem]">
        <form
          noValidate
          onSubmit={(event) => {
            // Enter in a field advances a step instead of submitting early.
            if (!isLast) {
              event.preventDefault();
              void next();
              return;
            }
            void handleSubmit(onSubmit)(event);
          }}
          className="relative rounded-3xl border border-border bg-surface/70 p-5 sm:p-8"
          aria-labelledby="booking-step-title"
          data-step={current.id}
        >
          {/* Progress */}
          <nav aria-label={t("progress")}>
            <ol className="flex items-center gap-1.5">
              {BOOKING_STEPS.map((s, index) => {
                const done = index < step;
                const reachable = index <= furthest;
                return (
                  <li key={s.id} className="flex flex-1 flex-col gap-2">
                    <button
                      type="button"
                      disabled={!reachable}
                      onClick={() => goTo(index)}
                      aria-current={index === step ? "step" : undefined}
                      className="group flex flex-col gap-2 text-start disabled:cursor-default"
                    >
                      <span className={cn("h-1.5 w-full rounded-full transition-colors", index <= step ? "bg-accent" : reachable ? "bg-accent/40" : "bg-surface-2")} />
                      <span className={cn("hidden items-center gap-1 text-xs sm:flex", index === step ? "font-semibold text-foreground" : "text-muted group-enabled:group-hover:text-foreground")}>
                        {done && <Check className="size-3 text-success" aria-hidden />}
                        {t(`steps.${s.id}`)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="mt-6 flex items-baseline justify-between gap-3">
            <h3 id="booking-step-title" ref={stepHeading} tabIndex={-1} className="text-xl font-semibold outline-none">
              {
                {
                  service: t("service.heading"),
                  scope: t("scope.heading"),
                  budget: t("budget.heading"),
                  contact: t("contact.heading"),
                  review: t("review.heading"),
                }[current.id]
              }
            </h3>
            <span className="shrink-0 text-xs text-muted">{t("stepOf", { current: step + 1, total: BOOKING_STEPS.length })}</span>
          </div>

          {banner && (
            <p
              role={banner.kind === "error" ? "alert" : "status"}
              className={cn(
                "mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm",
                banner.kind === "error" ? "border-danger/40 bg-danger/10" : "border-pulse/40 bg-pulse/5",
              )}
            >
              <AlertCircle className={cn("mt-0.5 size-4 shrink-0", banner.kind === "error" ? "text-danger" : "text-pulse")} aria-hidden />
              {banner.text}
            </p>
          )}

          <div className="mt-6">
            {step === 0 && <ServiceStep services={services} />}
            {step === 1 && <ScopeStep />}
            {step === 2 && <BudgetStep estimate={estimateCard} />}
            {step === 3 && <ContactStep />}
            {step === 4 && <ReviewStep services={services} onEdit={goTo} />}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
            {step > 0 ? (
              <Button type="button" variant="ghost" onClick={() => goTo(step - 1)}>
                <Back /> {t("actions.back")}
              </Button>
            ) : (
              <span />
            )}
            {isLast ? (
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="rtl:-scale-x-100" />}
                {formState.isSubmitting ? t("actions.submitting") : t("actions.submit")}
              </Button>
            ) : (
              <Button type="submit">
                {t("actions.next")} <Forward />
              </Button>
            )}
          </div>
        </form>

        {/* Live summary (large screens) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            {estimateCard}
            <div className="rounded-xl border border-border p-4 text-sm">
              <p className="text-xs font-semibold text-muted">{t("steps.service")}</p>
              <p className="mt-1 font-medium">{selectedService?.title ?? t("service.notSure")}</p>
              <p className="mt-3 text-xs font-semibold text-muted">{t("scope.timeline")}</p>
              <p className="mt-1 font-medium">{t(`timelines.${timeline ?? "1_3_months"}`)}</p>
              <p className="mt-3 text-xs font-semibold text-muted">{t("scope.complexity")}</p>
              <p className="mt-1 font-medium">{t(`scope.complexityLevels.${(Number(complexity) || 3) as 1}`)}</p>
            </div>
          </div>
        </aside>
      </div>
    </FormProvider>
  );
}
