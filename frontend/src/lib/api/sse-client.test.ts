import { describe, expect, it, vi } from "vitest";
import { createSseParser, streamChat, type ChatStreamHandlers } from "./sse-client";

function sseResponse(chunks: string[], init: ResponseInit = {}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(encoder.encode(c)));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" }, ...init });
}

describe("createSseParser", () => {
  it("assembles frames split across chunks and skips comments / malformed data", () => {
    const parse = createSseParser();

    expect(parse('event: session\ndata: {"session_id":"s1"}\n\nevent: tok')).toEqual([{ event: "session", data: { session_id: "s1" } }]);
    expect(parse('en\ndata: {"delta":"Hi"}\n\n: ping\n\nevent: token\ndata: {broken\n\n')).toEqual([{ event: "token", data: { delta: "Hi" } }]);
    expect(parse('event: done\r\ndata: {"message_id":1}\r\n\r\n')).toEqual([{ event: "done", data: { message_id: 1 } }]);
  });
});

describe("streamChat", () => {
  const handlers = (): Required<ChatStreamHandlers> => ({
    onSession: vi.fn(),
    onSources: vi.fn(),
    onToken: vi.fn(),
    onToolCall: vi.fn(),
    onAction: vi.fn(),
    onToolResult: vi.fn(),
    onReset: vi.fn(),
    onDone: vi.fn(),
    onError: vi.fn(),
  });

  it("dispatches every event type and validates actions", async () => {
    const frames = [
      'event: session\ndata: {"session_id":"abc"}\n\n',
      'event: sources\ndata: [{"document_id":1,"title":"FAQ","score":0.8}]\n\n',
      'event: token\ndata: {"delta":"Hel"}\n\nevent: token\ndata: {"de',
      'lta":"lo"}\n\n',
      'event: reset\ndata: {"text":""}\n\n',
      'event: action\ndata: {"id":"a1","type":"trigger_3d_workflow","payload":{"projectSlug":"lead-enrichment-engine","mode":"exploded"}}\n\n',
      'event: action\ndata: {"id":"a2","type":"delete_everything","payload":{}}\n\n',
      'event: done\ndata: {"message_id":7,"usage":{"input":1,"output":2}}\n\n',
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sseResponse(frames)));
    const h = handlers();

    await streamChat({ message: "hi", locale: "ar" }, h);

    expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/ai/chat", expect.objectContaining({ method: "POST" }));
    expect(h.onSession).toHaveBeenCalledWith("abc");
    expect(h.onSources).toHaveBeenCalledWith([{ document_id: 1, title: "FAQ", score: 0.8 }]);
    expect(vi.mocked(h.onToken).mock.calls.map(([delta]) => delta)).toEqual(["Hel", "lo"]);
    expect(h.onReset).toHaveBeenCalledWith("");
    expect(h.onAction).toHaveBeenCalledTimes(1); // the unknown action type is dropped
    expect(h.onAction).toHaveBeenCalledWith({
      id: "a1",
      type: "trigger_3d_workflow",
      payload: { projectSlug: "lead-enrichment-engine", mode: "exploded" },
    });
    expect(h.onDone).toHaveBeenCalledWith({ message_id: 7, usage: { input: 1, output: 2 } });
    expect(h.onError).not.toHaveBeenCalled();
  });

  it("surfaces problem+json responses (e.g. 429) as errors", async () => {
    const problem = { type: "https://afaqn8n.me/problems/rate-limited", title: "Too many requests", status: 429, code: "RATE_LIMITED", retry_after: 42 };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(problem), { status: 429, headers: { "Content-Type": "application/problem+json" } })),
    );
    const h = handlers();

    await streamChat({ message: "hi", locale: "en" }, h);

    expect(h.onError).toHaveBeenCalledWith(expect.objectContaining({ code: "RATE_LIMITED", retry_after: 42 }));
  });

  it("reports network failures but stays silent when aborted", async () => {
    const h = handlers();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await streamChat({ message: "hi", locale: "en" }, h);
    expect(h.onError).toHaveBeenCalledWith(expect.objectContaining({ code: "NETWORK_ERROR" }));

    const aborted = handlers();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" })));
    await streamChat({ message: "hi", locale: "en" }, aborted);
    expect(aborted.onError).not.toHaveBeenCalled();
  });
});
