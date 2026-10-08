"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { AgentAction } from "@/lib/agent/actions";
import { drainAgentActions } from "@/lib/agent/run-action";
import { useAgentStore } from "@/stores/agent-store";
import { useSceneStore } from "@/stores/scene-store";

/**
 * Bridge between the AI agent and the page: drains `pendingActions` one at a time
 * (scroll, 3D project + explode, booking confirmation) and toasts what happened.
 * Mounted once in the layout; also rehydrates the persisted Copilot conversation.
 */
export function AgentActionRunner() {
  const t = useTranslations();
  const pending = useAgentStore((state) => state.pendingActions.length);
  const notifyRef = useRef<(action: AgentAction, outcome: "ok" | "skipped") => void>(() => {});

  useEffect(() => {
    notifyRef.current = (action, outcome) => {
      if (outcome === "skipped") return;
      switch (action.type) {
        case "navigate_to":
          toast(t("copilot.navigated", { section: t(`nav.${action.payload.sectionId}`) }));
          break;
        case "trigger_3d_workflow": {
          const title = useSceneStore.getState().projectTitles[action.payload.projectSlug] ?? action.payload.projectSlug;
          toast(t("copilot.workflowShown", { project: title, mode: t(`copilot.modes.${action.payload.mode}`) }));
          break;
        }
        case "service_inquiry_submitted":
          toast.success(t("copilot.inquirySubmitted", { reference: action.payload.reference }));
          break;
      }
    };
  }, [t]);

  useEffect(() => {
    void useAgentStore.persist.rehydrate();

    // Dev/E2E hook: lets Playwright and manual checks drive the stores like the agent would.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __afaq?: unknown }).__afaq = { agent: useAgentStore, scene: useSceneStore };
    }
  }, []);

  useEffect(() => {
    if (pending > 0) void drainAgentActions({ notify: (action, outcome) => notifyRef.current(action, outcome) });
  }, [pending]);

  return null;
}
