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

describe("agent store — Copilot widget behaviour", () => {
  it("tracks server tool activity on the answer", async () => {
    script.run = (h) => {
      h.onToolCall?.({ id: "t1", name: "submit_service_inquiry", args: {} });
      h.onToolResult?.({ id: "t1", ok: true, summary: "AFQ-7K2M9P" });
      h.onToolCall?.({ id: "t2", name: "navigate_to", args: {} }); // never resolved
    };
    await useAgentStore.getState().send("book it", "en");

    expect(useAgentStore.getState().messages.at(-1)!.tools).toEqual([
      { id: "t1", name: "submit_service_inquiry", status: "ok", summary: "AFQ-7K2M9P" },
      { id: "t2", name: "navigate_to", status: "failed" },
    ]);
  });

  it("retries a failed answer by re-sending the same question once", async () => {
    script.run = (h) => h.onError?.({ type: "x", title: "Upstream", status: 502, code: "AI_PROVIDER_ERROR" });
    await useAgentStore.getState().send("what do you offer?", "en");
    expect(useAgentStore.getState().status).toBe("error");

    script.run = (h) => {
      h.onToken?.("We build n8n automations.");
      h.onDone?.({ message_id: 2, usage: { input: 1, output: 1 } });
    };
    await useAgentStore.getState().retry("en");

    const state = useAgentStore.getState();
    expect(streamChat).toHaveBeenCalledTimes(2);
    expect(state.status).toBe("idle");
    expect(state.messages.map((m) => [m.role, m.content, m.status])).toEqual([
      ["user", "what do you offer?", "complete"],
      ["assistant", "We build n8n automations.", "complete"],
    ]);
  });

  it("counts unread answers only while the panel is closed", async () => {
    script.run = (h) => h.onDone?.({ message_id: 1, usage: { input: 1, output: 1 } });
    await useAgentStore.getState().send("one", "en");
    expect(useAgentStore.getState().unread).toBe(1);

    useAgentStore.getState().open();
    expect(useAgentStore.getState().unread).toBe(0);
    await useAgentStore.getState().send("two", "en");
    expect(useAgentStore.getState().unread).toBe(0);
  });

  it("ask() opens the panel and sends", async () => {
    await useAgentStore.getState().ask("Show me the invoice project", "en");
    expect(useAgentStore.getState().isOpen).toBe(true);
    expect(streamChat).toHaveBeenCalledOnce();
  });

  it("restores the transcript from the API, or forgets an expired session", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: 1, role: "user", content: "hi", created_at: "2026-10-08T10:00:00Z" }, { id: 2, role: "assistant", content: "Hello!", created_at: "2026-10-08T10:00:01Z" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    useAgentStore.setState({ sessionId: "11111111-1111-4111-8111-111111111111", messages: [] });
    await useAgentStore.getState().restoreFromServer();
    expect(fetchMock.mock.calls[0][0].toString()).toContain("/ai/sessions/11111111-1111-4111-8111-111111111111/messages");
    expect(useAgentStore.getState().messages.map((m) => m.content)).toEqual(["hi", "Hello!"]);

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: "NOT_FOUND", status: 404, title: "Not found" }), { status: 404 }));
    useAgentStore.setState({ sessionId: "22222222-2222-4222-8222-222222222222", messages: [] });
    await useAgentStore.getState().restoreFromServer();
    expect(useAgentStore.getState().sessionId).toBeNull();
  });
});
