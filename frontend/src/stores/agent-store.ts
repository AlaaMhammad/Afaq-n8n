import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type { AgentAction } from "@/lib/agent/actions";
import { apiFetch, ApiError } from "@/lib/api/client";
import { streamChat, type ChatSource } from "@/lib/api/sse-client";
import type { ProblemDetails } from "@/lib/api/types";
import { useUiStore } from "./ui-store";

/**
 * Afaq Copilot conversation + the queue of UI actions requested by the agent.
 * Actions are executed one at a time by <AgentActionRunner/> (mounted once in the layout).
 * Spec: docs/01_architecture/state_management.md §2, docs/03_frontend_3d/ai_assistant_ui.md
 */

export type ChatRole = "user" | "assistant";
export type MessageStatus = "streaming" | "complete" | "error";

/** A server-side tool the model is running for this answer (e.g. submitting a booking). */
export interface ToolActivity {
  id: string;
  name: string;
  status: "running" | "ok" | "failed";
  summary?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status?: MessageStatus;
  sources?: ChatSource[];
  actions?: AgentAction[];
  tools?: ToolActivity[];
  problem?: ProblemDetails;
}

export type AgentStatus = "idle" | "connecting" | "streaming" | "error";

export interface AgentState {
  isOpen: boolean;
  sessionId: string | null;
  messages: ChatMessage[];
  status: AgentStatus;
  error: ProblemDetails | null;
  /** Assistant replies that finished while the panel was closed. */
  unread: number;
  pendingActions: AgentAction[];
  abortController: AbortController | null;

  open: () => void;
  close: () => void;
  toggle: () => void;
  send: (text: string, locale: "ar" | "en") => Promise<void>;
  /** Open the panel and send — used by the hero's "try asking" prompts. */
  ask: (text: string, locale: "ar" | "en") => Promise<void>;
  /** Re-sends the last user message after a failed answer. */
  retry: (locale: "ar" | "en") => Promise<void>;
  stop: () => void;
  /** Restores the transcript from the API when only the session id survived (e.g. another tab cleared it). */
  restoreFromServer: () => Promise<void>;
  enqueueAction: (action: AgentAction) => void;
  shiftAction: () => AgentAction | undefined;
  reset: () => void;
}

export const PERSISTED_MESSAGES = 30;
/** Tokens are applied to the store in batches, not per SSE frame, to keep re-renders cheap. */
export const TOKEN_FLUSH_MS = 32;

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

interface ServerMessage {
  id: number;
  role: ChatRole;
  content: string;
  created_at: string;
}

export const useAgentStore = create<AgentState>()(
  devtools(
    persist(
      (set, get) => ({
        isOpen: false,
        sessionId: null,
        messages: [],
        status: "idle",
        error: null,
        unread: 0,
        pendingActions: [],
        abortController: null,

        open: () => set({ isOpen: true, unread: 0 }),
        close: () => set({ isOpen: false }),
        toggle: () => set((state) => ({ isOpen: !state.isOpen, unread: state.isOpen ? state.unread : 0 })),

        send: async (text, locale) => {
          const message = text.trim().slice(0, 2000);
          if (!message || get().abortController) return;

          const controller = new AbortController();
          const assistantId = newId();
          const now = new Date().toISOString();

          set((state) => ({
            messages: [
              ...state.messages,
              { id: newId(), role: "user", content: message, createdAt: now, status: "complete" },
              { id: assistantId, role: "assistant", content: "", createdAt: now, status: "streaming", actions: [], tools: [] },
            ],
            status: "connecting",
            error: null,
            abortController: controller,
          }));

          const patch = (update: (m: ChatMessage) => ChatMessage) =>
            set((state) => ({ messages: state.messages.map((m) => (m.id === assistantId ? update(m) : m)) }));

          // Batch token deltas (~30 updates/s) instead of one store update per SSE frame.
          let buffered = "";
          let timer: ReturnType<typeof setTimeout> | null = null;
          const flush = () => {
            if (timer !== null) clearTimeout(timer);
            timer = null;
            if (!buffered) return;
            const delta = buffered;
            buffered = "";
            patch((m) => ({ ...m, content: m.content + delta }));
          };

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
                buffered += delta;
                timer ??= setTimeout(flush, TOKEN_FLUSH_MS);
              },
              onReset: (content) => {
                buffered = "";
                flush();
                patch((m) => ({ ...m, content }));
              },
              onToolCall: (call) => {
                flush();
                patch((m) => ({ ...m, tools: [...(m.tools ?? []).filter((t) => t.id !== call.id), { id: call.id, name: call.name, status: "running" }] }));
              },
              onToolResult: (result) =>
                patch((m) => ({
                  ...m,
                  tools: (m.tools ?? []).map((t) => (t.id === result.id ? { ...t, status: result.ok ? "ok" : "failed", summary: result.summary } : t)),
                })),
              onAction: (action) => {
                flush();
                patch((m) => ({ ...m, actions: [...(m.actions ?? []), action] }));
                get().enqueueAction(action);
              },
              onDone: () => {
                flush();
                patch((m) => ({ ...m, status: "complete" }));
              },
              onError: (problem) => {
                flush();
                patch((m) => ({ ...m, status: "error", problem }));
                set({ error: problem });
              },
            },
            controller.signal,
          );

          // Stopped by the user or the stream ended without `done`: keep what arrived.
          flush();
          patch((m) => ({
            ...m,
            status: m.status === "streaming" ? "complete" : m.status,
            tools: (m.tools ?? []).map((t) => (t.status === "running" ? { ...t, status: "failed" } : t)),
          }));
          set((state) => ({
            status: state.error ? "error" : "idle",
            abortController: null,
            unread: state.isOpen ? 0 : state.unread + 1,
          }));
        },

        ask: async (text, locale) => {
          get().open();
          await get().send(text, locale);
        },

        retry: async (locale) => {
          const { messages, abortController } = get();
          if (abortController) return;
          const failedIndex = messages.findLastIndex((m) => m.role === "assistant");
          const userIndex = messages.findLastIndex((m, i) => m.role === "user" && i < failedIndex);
          if (failedIndex === -1 || userIndex === -1 || messages[failedIndex].status !== "error") return;

          const text = messages[userIndex].content;
          set({ messages: messages.filter((_, i) => i !== failedIndex && i !== userIndex), error: null, status: "idle" });
          await get().send(text, locale);
        },

        stop: () => {
          get().abortController?.abort();
        },

        restoreFromServer: async () => {
          const { sessionId, messages } = get();
          if (!sessionId || messages.length > 0) return;
          try {
            const history = await apiFetch<ServerMessage[]>(`ai/sessions/${sessionId}/messages`);
            if (get().messages.length > 0) return; // the visitor started typing meanwhile
            set({
              messages: history
                .filter((m) => m.content.trim() !== "")
                .slice(-PERSISTED_MESSAGES)
                .map((m) => ({ id: `srv-${m.id}`, role: m.role, content: m.content, createdAt: m.created_at, status: "complete" as const })),
            });
          } catch (error) {
            // Expired or unknown session: start fresh rather than sending a dead id.
            if (error instanceof ApiError && error.problem.status === 404) set({ sessionId: null });
          }
        },

        enqueueAction: (action) => set((state) => ({ pendingActions: [...state.pendingActions, action] })),

        shiftAction: () => {
          const [next, ...rest] = get().pendingActions;
          if (next) set({ pendingActions: rest });
          return next;
        },

        reset: () => {
          get().abortController?.abort();
          set({ sessionId: null, messages: [], status: "idle", error: null, unread: 0, pendingActions: [], abortController: null });
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
