import { z } from "zod";
import type { BudgetRange, Timeline } from "@/lib/api/types";

/**
 * Booking form model, mirroring StoreServiceRequestRequest on the Laravel side so the visitor
 * sees the same rules before submitting. Error messages are i18n keys under `booking.validation`.
 * Spec: docs/04_features/service_request.md §2
 */

export const BUDGET_RANGES = ["lt_1k", "1k_5k", "5k_15k", "15k_50k", "gt_50k"] as const satisfies readonly BudgetRange[];
export const TIMELINES = ["asap", "1_month", "1_3_months", "flexible"] as const satisfies readonly Timeline[];
export const COMPLEXITY_LEVELS = [1, 2, 3, 4, 5] as const;

/** Same pattern as the API: optional +, Latin or Arabic-Indic digits, spaces, dashes, brackets. */
const PHONE = /^\+?[0-9٠-٩\s\-()]{8,20}$/u;

export const bookingSchema = z.object({
  /** "" = "not sure yet — advise me" */
  service_slug: z.string(),
  requirements: z.string().trim().min(20, "requirementsMin").max(5000, "requirementsMax"),
  complexity: z.number().int().min(1).max(5),
  timeline: z.enum(TIMELINES),
  budget_range: z.enum(BUDGET_RANGES, "budgetRequired"),
  client_name: z.string().trim().min(2, "nameMin").max(120, "nameMin"),
  client_email: z.string().trim().max(254, "emailInvalid").pipe(z.email("emailInvalid")),
  client_phone: z.union([z.literal(""), z.string().trim().regex(PHONE, "phoneInvalid")]),
  company: z.string().trim().max(160),
  consent: z.boolean().refine((accepted) => accepted, "consentRequired"),
  /** Honeypot: invisible to people, bots fill it. Must stay empty. */
  website: z.string().max(255),
});

export type BookingInput = z.input<typeof bookingSchema>;
export type BookingValues = z.output<typeof bookingSchema>;
export type BookingField = keyof BookingInput;

export const BOOKING_STEPS = [
  { id: "service", fields: ["service_slug"] },
  { id: "scope", fields: ["requirements", "complexity", "timeline"] },
  { id: "budget", fields: ["budget_range"] },
  { id: "contact", fields: ["client_name", "client_email", "client_phone", "company"] },
  { id: "review", fields: ["consent"] },
] as const satisfies readonly { id: string; fields: readonly BookingField[] }[];

export type BookingStepId = (typeof BOOKING_STEPS)[number]["id"];

export const BOOKING_DEFAULTS: BookingInput = {
  service_slug: "",
  requirements: "",
  complexity: 3,
  timeline: "1_3_months",
  budget_range: undefined as unknown as BookingInput["budget_range"],
  client_name: "",
  client_email: "",
  client_phone: "",
  company: "",
  consent: false,
  website: "",
};

/** Index of the first step that owns any of the given fields (e.g. from a 422 response). */
export function firstStepWithError(fields: readonly string[]): number {
  const index = BOOKING_STEPS.findIndex((step) => step.fields.some((field) => fields.includes(field)));
  return index === -1 ? BOOKING_STEPS.length - 1 : index;
}

/** Shape sent to POST /service-requests. Empty optionals are omitted rather than sent blank. */
export function toServiceRequest(values: BookingValues, locale: "ar" | "en", utm?: Record<string, string>) {
  return {
    client_name: values.client_name,
    client_email: values.client_email,
    client_phone: values.client_phone || undefined,
    company: values.company || undefined,
    service_slug: values.service_slug || undefined,
    budget_range: values.budget_range,
    timeline: values.timeline,
    complexity: values.complexity,
    requirements: values.requirements,
    locale,
    consent: values.consent,
    website: values.website || undefined,
    ...(utm && Object.keys(utm).length > 0 ? { utm } : {}),
  };
}

/** utm_source/medium/campaign from the landing URL, as the API's `utm` object. */
export function readUtm(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const utm: Record<string, string> = {};
  for (const key of ["source", "medium", "campaign"] as const) {
    const value = params.get(`utm_${key}`);
    if (value) utm[key] = value.slice(0, 80);
  }
  return utm;
}
