"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/utils";
import { useSceneStore } from "@/stores/scene-store";

/**
 * Scroll-driven reveal: when the stage is mostly in view, the workflow explodes after a short
 * beat (so the assembled state is seen first); scrolling it fully out of view reassembles it.
 * Switching projects while in view replays the reveal. All of this stops for the visit as soon
 * as the visitor or the AI agent sets the mode themselves (`autoExplode` in the scene store).
 */
export function useScrollExplode(ref: React.RefObject<Element | null>, { threshold = 0.6, delayMs = 650 } = {}) {
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    let inView = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scene = useSceneStore.getState;

    const scheduleExplode = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => {
          if (inView) scene().setMode("exploded", "scroll");
        },
        prefersReducedMotion() ? 0 : delayMs,
      );
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nowInView = entry.intersectionRatio >= threshold;
        if (nowInView && !inView) {
          inView = true;
          scheduleExplode();
        } else if (!entry.isIntersecting) {
          inView = false;
          clearTimeout(timer);
          scene().setMode("assembled", "scroll");
        } else if (!nowInView) {
          inView = false;
        }
      },
      { threshold: [0, threshold] },
    );
    observer.observe(element);

    const unsubscribe = useSceneStore.subscribe((state, previous) => {
      if (state.activeProjectSlug !== previous.activeProjectSlug && inView && state.autoExplode) scheduleExplode();
    });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      unsubscribe();
    };
  }, [ref, threshold, delayMs]);
}
