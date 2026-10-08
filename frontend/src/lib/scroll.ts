import type { SectionId } from "@/lib/api/types";
import { useUiStore } from "@/stores/ui-store";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * Smooth-scrolls to a page section and resolves when scrolling has settled
 * (`scrollend` where supported, otherwise a timeout). Instant with reduced motion.
 */
export function scrollToSection(id: SectionId, { timeoutMs = 900 }: { timeoutMs?: number } = {}): Promise<void> {
  useUiStore.getState().setActiveSection(id);

  const element = typeof document !== "undefined" ? document.getElementById(id) : null;
  if (!element) return Promise.resolve();

  const instant = prefersReducedMotion();
  // "instant", not "auto": auto inherits the global CSS `scroll-behavior: smooth`.
  element.scrollIntoView({ behavior: instant ? "instant" : "smooth", block: "start" });
  if (instant) return Promise.resolve();

  return new Promise((resolve) => {
    // Holder object: `done` may run before the timeout handle exists (e.g. an immediate scrollend).
    const pending: { timer?: ReturnType<typeof setTimeout> } = {};
    const done = () => {
      window.removeEventListener("scrollend", done);
      if (pending.timer !== undefined) clearTimeout(pending.timer);
      resolve();
    };
    window.addEventListener("scrollend", done, { once: true });
    pending.timer = setTimeout(done, timeoutMs);
  });
}
