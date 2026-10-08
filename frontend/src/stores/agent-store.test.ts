import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatStreamHandlers } from "@/lib/api/sse-client";

const script: { run: (handlers: ChatStreamHandlers) => void } = { run: () => {} };
const streamChat = vi.fn(async (_body: unknown, handlers: ChatStreamHandlers) => script.run(handlers));
vi.mock("@/lib/api/sse-client", () => ({ streamChat: (body: unknown, handlers: ChatStreamHandlers) => streamChat(body, handlers) }));

const { useAgentStore, PERSISTED_MESSAGES } = await import("./agent-store");
const { useUiStore } = await import("./ui-store");

const action = { id: "a1", type: "navigate_to", payload: { sectionId: "team" } } as const;

beforeEach(() => {
  useAgentStore.getState().reset();
  streamChat.mockClear();
});

describe("agent store", () => {
  it("streams an answer, records session/sources/actions and queues the actions", async () => {
    useUiStore.getState().setActiveSection("portfolio");
    script.run = (h) => {
      h.onSession?.("sess-1");
      h.onSources?.([{ document_id: 3, title: "FAQ", score: 0.7 }]);
      h.onToken?.("Hello ");
      h.onToken?.("wor");
      h.onReset?.("Hello ");
      h.onToken?.("world");
      h.onAction?.(action);
      h.onDone?.({ message_id: 1, usage: { input: 1, output: 1 } });
    };

    await useAgentStore.getState().send("  hi  ", "en");

    const state = useAgentStore.getState();
    expect(streamChat.mock.calls[0][0]).toEqual({ message: "hi", locale: "en", session_id: null, context: { active_section: "portfolio" } });
    expect(state.sessionId).toBe("sess-1");
    expect(state.status).toBe("idle");
    expect(state.messages.map((m) => [m.role, m.content, m.status])).toEqual([
      ["user", "hi", "complete"],
      ["assistant", "Hello world", "complete"],
    ]);
    expect(state.messages[1].sources).toHaveLength(1);
    expect(state.messages[1].actions).toEqual([action]);
    expect(state.pendingActions).toEqual([action]);
  });

  it("keeps the session for follow-ups and marks errors", async () => {
    script.run = (h) => h.onSession?.("sess-2");
    await useAgentStore.getState().send("first", "ar");

    script.run = (h) => h.onError?.({ type: "x", title: "Too many requests", status: 429, code: "RATE_LIMITED" });
    await useAgentStore.getState().send("second", "ar");

    expect((streamChat.mock.calls[1][0] as { session_id: string }).session_id).toBe("sess-2");
    expect(useAgentStore.getState().status).toBe("error");
    expect(useAgentStore.getState().messages.at(-1)).toMatchObject({ status: "error", problem: { code: "RATE_LIMITED" } });
  });

  it("ignores empty messages and runs actions in FIFO order", async () => {
    await useAgentStore.getState().send("   ", "en");
    expect(streamChat).not.toHaveBeenCalled();

    const s = useAgentStore.getState();
    s.enqueueAction(action);
    s.enqueueAction({ ...action, id: "a2" });
    expect(useAgentStore.getState().shiftAction()?.id).toBe("a1");
    expect(useAgentStore.getState().shiftAction()?.id).toBe("a2");
    expect(useAgentStore.getState().shiftAction()).toBeUndefined();
  });

  it("persists only the session id and the last completed messages", () => {
    const messages = Array.from({ length: 40 }, (_, i) => ({
      id: `${i}`,
      role: "user" as const,
      content: `m${i}`,
      createdAt: "",
      status: "complete" as const,
    }));
    useAgentStore.setState({
      sessionId: "keep",
      messages: [...messages, { id: "s", role: "assistant", content: "…", createdAt: "", status: "streaming" }],
      pendingActions: [action],
    });

    const stored = JSON.parse(localStorage.getItem("afaq-copilot")!).state;
    expect(Object.keys(stored).sort()).toEqual(["messages", "sessionId"]);
    expect(stored.messages).toHaveLength(PERSISTED_MESSAGES);
    expect(stored.messages.at(-1).content).toBe("m39");
  });
});
