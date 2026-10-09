"use client";

import { useEffect } from "react";
import { useUiStore } from "@/stores/ui-store";

/**
 * Mirrors what the visitor points at or focuses (`data-focus-service` / `data-focus-member` on any
 * element) into the UI store, where the 3D vignettes read it — a service card pulls its rack blade
 * out, a team card brings its profile chip forward. One delegated listener for the whole page.
 */
export function StageFocusBridge() {
  useEffect(() => {
    const update = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      const service = element?.closest<HTMLElement>("[data-focus-service]")?.dataset.focusService ?? null;
      const memberValue = element?.closest<HTMLElement>("[data-focus-member]")?.dataset.focusMember;
      const member = memberValue ? Number(memberValue) : null;
      const { focus, setFocus } = useUiStore.getState();
      if (focus.service !== service || focus.member !== member) setFocus({ service, member });
    };
    const onOver = (event: PointerEvent) => update(event.target);
    const onFocus = (event: FocusEvent) => update(event.target);
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("focusin", onFocus);
    };
  }, []);

  return null;
}
