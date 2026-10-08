import { apiFetch } from "./client";
import type { BudgetRange, Estimate, ServiceRequestCreated, ServiceRequestInput, Timeline } from "./types";

/** Client-side calls for the booking form (Phase 6 UI). */
export function submitServiceRequest(input: ServiceRequestInput): Promise<ServiceRequestCreated> {
  return apiFetch<ServiceRequestCreated>("service-requests", { json: input, locale: input.locale });
}

export function fetchEstimate(input: {
  service_slug?: string;
  timeline?: Timeline;
  complexity?: number;
  budget_range?: BudgetRange;
}, signal?: AbortSignal): Promise<Estimate> {
  return apiFetch<Estimate>("service-requests/estimate", { json: input, signal });
}
