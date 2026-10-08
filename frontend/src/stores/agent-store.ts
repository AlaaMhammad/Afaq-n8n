import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type { AgentAction } from "@/lib/agent/actions";
import { streamChat, type ChatSource } from "@/lib/api/sse-client";
import type { ProblemDetails } from "@/lib/api/types";
import { useUiStore } from "./ui-store";

/**
 * Afaq Copilot conversation + the queue of UI actions requested by the agent.
 * Actions are executed one at a time by <AgentActionRunner/> (mounted once in the layout).
 * Spec: docs/01_architecture/state_management.md §2
 */

export type ChatRole = "user" | "assistant";
export type MessageStatus = "streaming" | "complete" | "error";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status?: MessageStatus;
  sources?: ChatSource[];
  actions?: AgentAction[];
  problem?: ProblemDetails;
}

export type AgentStatus = "idle" | "connecting" | "streaming" | "error";

export interface AgentState {
  isOpen: boolean;
  sessionId: string | null;
  messages: ChatMessage[];
  status: AgentStatus;
  error: ProblemDetails | null;
  pendingActions: AgentAction[];
  abortController: AbortController | null;

  open: () => void;
  close: () => void;
  toggle: () => void;
  send: (text: string, locale: "ar" | "en") => Promise<void>;
  stop: () => void;
  enqueueAction: (action: AgentAction) => void;
  shiftAction: () => AgentAction | undefined;
  reset: () => void;
}

export const PERSISTED_MESSAGES = 30;

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export const useAgentStore = create<AgentState>()(
  devtools(
    persist(
      (set, get) => ({
        isOpen: false,
        sessionId: null,
        messages: [],
        status: "idle",
        error: null,
        pendingActions: [],
        abortController: null,

        open: () => set({ isOpen: true }),
        close: () => set({ isOpen: false }),
        toggle: () => set((state) => ({ isOpen: !state.isOpen })),

        send: async (text, locale) => {
          const message = text.trim();
          if (!message || get().abortController) return;

          const controller = new AbortController();
          const assistantId = newId();
          const now = new Date().toISOString();

          set((state) => ({
            messages: [
              ...state.messages,
              { id: newId(), role: "user", content: message, createdAt: now, status: "complete" },
              { id: assistantId, role: "assistant", content: "", createdAt: now, status: "streaming", actions: [] },
            ],
            status: "connecting",
            error: null,
            abortController: controller,
          }));

          const patch = (update: (m: ChatMessage) => ChatMessage) =>
            set((state) => ({ messages: state.messages.map((m) => (m.id === assistantId ? update(m) : m)) }));

          await streamChat(
            {
              message,
              locale,
              session_id: get().sessionId,
              context: { active_section: useUiStore.getState().activeSection },
            },
            {
              onSession: (sessionId) => set({ sessionId }),
              onSources: (sources) => patch((m) => ({ ...m, sources })),
              onToken: (delta) => {
                if (get().status !== "streaming") set({ status: "streaming" });
                patch((m) => ({ ...m, content: m.content + delta }));
              },
              onReset: (content) => patch((m) => ({ ...m, content })),
              onAction: (action) => {
                patch((m) => ({ ...m, actions: [...(m.actions ?? []), action] }));
                get().enqueueAction(action);
              },
              onDone: () => patch((m) => ({ ...m, status: "complete" })),
              onError: (problem) => {
                patch((m) => ({ ...m, status: "error", problem }));
                set({ error: problem });
              },
            },
            controller.signal,
          );

          // Stopped by the user or the stream ended without `done`: keep what arrived.
          patch((m) => (m.status === "streaming" ? { ...m, status: "complete" } : m));
          set((state) => ({ status: state.error ? "error" : "idle", abortController: null }));
        },

        stop: () => {
          get().abortController?.abort();
        },

        enqueueAction: (action) => set((state) => ({ pendingActions: [...state.pendingActions, action] })),

        shiftAction: () => {
          const [next, ...rest] = get().pendingActions;
          if (next) set({ pendingActions: rest });
          return next;
        },

        reset: () => {
          get().abortController?.abort();
          set({ sessionId: null, messages: [], status: "idle", error: null, pendingActions: [], abortController: null });
        },
      }),
      {
        name: "afaq-copilot",
        version: 1,
        storage: createJSONStorage(() => localStorage),
        // Hydrated explicitly on the client (AgentActionRunner) to avoid SSR mismatches.
        skipHydration: true,
        partialize: (state) => ({
          sessionId: state.sessionId,
          messages: state.messages
            .filter((m) => m.status !== "streaming")
            .slice(-PERSISTED_MESSAGES)
            .map((m) => ({ ...m, problem: undefined })),
        }),
      },
    ),
    { name: "agent", enabled: process.env.NODE_ENV === "development" },
  ),
);
