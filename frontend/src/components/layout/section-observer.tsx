"use client";

import { useEffect } from "react";
import type { SectionId } from "@/lib/api/types";
import { SECTION_IDS } from "@/lib/agent/actions";
import { useUiStore } from "@/stores/ui-store";

/**
 * Tracks which section is in view (nav highlight + `context.active_section` sent to the AI agent).
 */
export function SectionObserver() {
  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) useUiStore.getState().setActiveSection(visible.target.id as SectionId);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return null;
}
