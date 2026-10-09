"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, Bot } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAgentStore } from "@/stores/agent-store";
import { Markdown } from "./markdown";
import { MessageBubble } from "./message-bubble";

const QUICK_PROMPTS = ["services", "workflow", "pricing", "book"] as const;

/**
 * The conversation log. Sticks to the bottom while new tokens arrive unless the visitor has
 * scrolled up to read — then a "new messages" pill offers the way back.
 */
export function MessageList() {
  const t = useTranslations("copilot");
  const locale = useLocale() as "ar" | "en";
  const messages = useAgentStore((s) => s.messages);
  const status = useAgentStore((s) => s.status);
  const send = useAgentStore((s) => s.send);
  const retry = useAgentStore((s) => s.retry);
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const [showPill, setShowPill] = useState(false);

  const busy = status === "connecting" || status === "streaming";
  const last = messages.at(-1);
  // A signature that changes whenever visible content grows.
  const growth = `${messages.length}:${last?.content.length ?? 0}:${last?.actions?.length ?? 0}:${last?.tools?.length ?? 0}:${last?.status}`;

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    if (pinned.current) element.scrollTop = element.scrollHeight;
  }, [growth]);

  useEffect(() => {
    if (pinned.current) return;
    const timer = setTimeout(() => setShowPill(true), 0);
    return () => clearTimeout(timer);
  }, [growth]);

  const onScroll = () => {
    const element = scroller.current;
    if (!element) return;
    pinned.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
    if (pinned.current) setShowPill(false);
  };

  const toBottom = () => {
    const element = scroller.current;
    if (!element) return;
    pinned.current = true;
    setShowPill(false);
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scroller}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-busy={busy}
        aria-label={t("name")}
        className="h-full space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
      >
        <div className="flex gap-2.5">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-pulse/15 text-pulse" aria-hidden>
            <Bot className="size-4" />
          </span>
          <div className="rounded-2xl rounded-ss-md bg-surface-2 px-3.5 py-2.5 text-sm">
            <Markdown>{t("greeting")}</Markdown>
          </div>
        </div>

        {messages.map((message, index) => (
          <MessageBubble key={message.id} message={message} isLast={index === messages.length - 1} onRetry={() => void retry(locale)} />
        ))}

        {!busy && (messages.length === 0 || last?.status === "complete") && (
          <ul className="flex flex-wrap gap-2 ps-9" aria-label={t("tagline")}>
            {QUICK_PROMPTS.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => void send(t(`quickPrompts.${key}`), locale)}
                  className="rounded-full border border-pulse/40 px-3 py-1 text-xs text-pulse transition-colors hover:bg-pulse/10"
                >
                  {t(`quickPrompts.${key}`)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showPill && (
        <button
          type="button"
          onClick={toBottom}
          className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-pulse px-3 py-1 text-xs font-semibold text-black shadow-lg"
        >
          <ArrowDown className="size-3.5" aria-hidden /> {t("newMessages")}
        </button>
      )}
    </div>
  );
}
