"use client";

import { useEffect, useState } from "react";
import { fetchEstimate } from "@/lib/api/booking";
import type { BudgetRange, Estimate, Timeline } from "@/lib/api/types";

export type EstimateState = { status: "loading"; estimate: Estimate | null } | { status: "ready"; estimate: Estimate } | { status: "error"; estimate: null };

interface EstimateInput {
  service_slug: string;
  complexity: number;
  timeline: Timeline;
  budget_range?: BudgetRange;
}

/**
 * Live indicative estimate from POST /service-requests/estimate, debounced 400 ms. Each new
 * input aborts the previous request, so a slow answer can never overwrite a newer one.
 */
export function useLiveEstimate({ service_slug, complexity, timeline, budget_range }: EstimateInput, { delayMs = 400 } = {}): EstimateState {
  const [state, setState] = useState<EstimateState>({ status: "loading", estimate: null });

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState((previous) => ({ status: "loading", estimate: previous.estimate }));
      fetchEstimate({ service_slug: service_slug || undefined, complexity, timeline, budget_range }, controller.signal)
        .then((estimate) => setState({ status: "ready", estimate }))
        .catch(() => {
          if (!controller.signal.aborted) setState({ status: "error", estimate: null });
        });
    }, delayMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [service_slug, complexity, timeline, budget_range, delayMs]);

  return state;
}
