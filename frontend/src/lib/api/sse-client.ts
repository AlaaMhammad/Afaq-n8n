import { env } from "@/lib/env";
import { parseAgentAction, type AgentAction } from "@/lib/agent/actions";
import { readProblem } from "./client";
import type { ProblemDetails, SectionId } from "./types";

/**
 * Streams POST /api/v1/ai/chat (Server-Sent Events). EventSource can't POST, so this reads
 * the response body directly and parses `event:`/`data:` frames, which may arrive split
 * across network chunks. Event catalogue: docs/02_api_specs/endpoints.md §4.
 */

export interface ChatRequestBody {
  message: string;
  locale: "ar" | "en";
  session_id?: string | null;
  context?: { active_section?: SectionId };
}

export interface ChatSource {
  document_id: number;
  title: string;
  score: number;
}

export interface ChatStreamHandlers {
  onSession?(sessionId: string): void;
  onSources?(sources: ChatSource[]): void;
  onToken?(delta: string): void;
  onToolCall?(call: { id: string; name: string; args: Record<string, unknown> }): void;
  onAction?(action: AgentAction): void;
  onToolResult?(result: { id: string; ok: boolean; summary: string }): void;
  /** The provider failed mid-answer: replace the assistant text with `text`; more tokens follow. */
  onReset?(text: string): void;
  onDone?(done: { message_id: number; usage: { input: number; output: number } }): void;
  onError?(problem: ProblemDetails): void;
}

export interface SseFrame {
  event: string;
  data: unknown;
}

/** Incremental SSE parser: feed text chunks, get complete frames back. */
export function createSseParser() {
  let buffer = "";

  return (chunk: string): SseFrame[] => {
    buffer += chunk.replace(/\r\n/g, "\n");
    const frames: SseFrame[] = [];
    let boundary: number;

    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      let event = "message";
      const dataLines: string[] = [];
      for (const line of raw.split("\n")) {
        if (line.startsWith(":")) continue; // comment / heartbeat
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
      }
      if (dataLines.length === 0) continue;

      try {
        frames.push({ event, data: JSON.parse(dataLines.join("\n")) });
      } catch {
        // malformed frame — skip rather than break the stream
      }
    }

    return frames;
  };
}

export function dispatchFrame(frame: SseFrame, handlers: ChatStreamHandlers): void {
  const data = frame.data as Record<string, unknown>;

  switch (frame.event) {
    case "session":
      if (typeof data?.session_id === "string") handlers.onSession?.(data.session_id);
      break;
    case "sources":
      if (Array.isArray(frame.data)) handlers.onSources?.(frame.data as ChatSource[]);
      break;
    case "token":
      if (typeof data?.delta === "string") handlers.onToken?.(data.delta);
      break;
    case "tool_call":
      handlers.onToolCall?.(data as { id: string; name: string; args: Record<string, unknown> });
      break;
    case "action": {
      const action = parseAgentAction(frame.data);
      if (action) handlers.onAction?.(action);
      break;
    }
    case "tool_result":
      handlers.onToolResult?.(data as { id: string; ok: boolean; summary: string });
      break;
    case "reset":
      if (typeof data?.text === "string") handlers.onReset?.(data.text);
      break;
    case "done":
      handlers.onDone?.(data as { message_id: number; usage: { input: number; output: number } });
      break;
    case "error":
      handlers.onError?.(data as unknown as ProblemDetails);
      break;
  }
}

export async function streamChat(body: ChatRequestBody, handlers: ChatStreamHandlers, signal?: AbortSignal): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`${env.publicApiUrl}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream", "Accept-Language": body.locale },
      body: JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if ((cause as Error)?.name === "AbortError") return;
    handlers.onError?.({ type: "about:blank", title: "Network error", status: 0, code: "NETWORK_ERROR", detail: String(cause) });
    return;
  }

  if (!response.ok || !response.body) {
    handlers.onError?.(await readProblem(response));
    return;
  }

  const parse = createSseParser();
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const frame of parse(value)) dispatchFrame(frame, handlers);
    }
  } catch (cause) {
    if ((cause as Error)?.name !== "AbortError") {
      handlers.onError?.({ type: "about:blank", title: "Stream interrupted", status: 0, code: "STREAM_INTERRUPTED", detail: String(cause) });
    }
  } finally {
    reader.releaseLock();
  }
}
