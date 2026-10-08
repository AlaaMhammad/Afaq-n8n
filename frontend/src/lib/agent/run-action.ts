import type { AgentAction } from "./actions";
import { scrollToSection } from "@/lib/scroll";
import { prefersReducedMotion, wait } from "@/lib/utils";
import { useAgentStore } from "@/stores/agent-store";
import { useSceneStore } from "@/stores/scene-store";

let draining = false;

/**
 * Runs queued agent actions strictly one after another. Safe to call repeatedly:
 * concurrent calls return immediately while a drain is in progress, and actions
 * enqueued while the lock is being released are picked up by a follow-up pass.
 */
export async function drainAgentActions(effects: ActionEffects): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    for (let action = useAgentStore.getState().shiftAction(); action; action = useAgentStore.getState().shiftAction()) {
      await runAgentAction(action, effects);
    }
  } finally {
    draining = false;
  }
  if (useAgentStore.getState().pendingActions.length > 0) await drainAgentActions(effects);
}

/** Time for the camera to settle on a newly selected project before exploding it. */
export const CAMERA_SETTLE_MS = 400;

export interface ActionEffects {
  notify: (action: AgentAction, outcome: "ok" | "skipped") => void;
}

/**
 * Executes one validated agent action against the page and the 3D scene.
 * Idempotent: re-running the same action leaves the same state.
 */
export async function runAgentAction(action: AgentAction, effects: ActionEffects): Promise<void> {
  switch (action.type) {
    case "navigate_to":
      await scrollToSection(action.payload.sectionId);
      effects.notify(action, "ok");
      return;

    case "trigger_3d_workflow": {
      const scene = useSceneStore.getState();
      if (!scene.setActiveProject(action.payload.projectSlug)) {
        effects.notify(action, "skipped"); // unknown project — never act on unverified input
        return;
      }
      await scrollToSection("portfolio");
      if (!prefersReducedMotion()) await wait(CAMERA_SETTLE_MS);
      useSceneStore.getState().setMode(action.payload.mode);
      effects.notify(action, "ok");
      return;
    }

    case "service_inquiry_submitted":
      effects.notify(action, "ok");
      return;
  }
}
