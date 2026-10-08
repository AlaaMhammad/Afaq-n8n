"use client";

import { useSyncExternalStore } from "react";

/**
 * Live `matchMedia` result. Returns `serverValue` during SSR and hydration, then the real value —
 * no setState-in-effect, no hydration mismatch.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : serverValue),
    () => serverValue,
  );
}

export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
/** Mouse/trackpad — drag-to-orbit is enabled only here so touch keeps native page scrolling. */
export const useFinePointer = () => useMediaQuery("(pointer: fine)");
