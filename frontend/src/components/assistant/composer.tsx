"use client";

import { forwardRef, useRef, useState } from "react";
import { Mic, MicOff, SendHorizontal, Square } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/stores/agent-store";
import { useSpeechInput } from "./use-speech-input";

const MAX_CHARS = 2000;
const COUNTER_FROM = 1500;

/**
 * Message input: Enter sends, Shift+Enter adds a line, ↑ in an empty box recalls the last
 * question. Send turns into Stop while an answer streams. Optional voice input.
 */
export const Composer = forwardRef<HTMLTextAreaElement>(function Composer(_, ref) {
  const t = useTranslations("copilot");
  const locale = useLocale() as "ar" | "en";
  const [text, setText] = useState("");
  const status = useAgentStore((s) => s.status);
  const send = useAgentStore((s) => s.send);
  const stop = useAgentStore((s) => s.stop);
  const busy = status === "connecting" || status === "streaming";
  const beforeSpeech = useRef("");

  const speech = useSpeechInput({
    locale,
    onTranscript: (spoken) => setText(`${beforeSpeech.current}${beforeSpeech.current && spoken ? " " : ""}${spoken}`.slice(0, MAX_CHARS)),
  });

  const submit = () => {
    if (busy || !text.trim()) return;
    speech.stop();
    void send(text, locale);
    setText("");
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    } else if (event.key === "ArrowUp" && text === "") {
      const lastQuestion = useAgentStore.getState().messages.findLast((m) => m.role === "user");
      if (lastQuestion) {
        event.preventDefault();
        setText(lastQuestion.content);
      }
    }
  };

  return (
    <form
      className="border-t border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex items-end gap-2 rounded-xl border border-border bg-surface-2 p-1.5 focus-within:border-pulse/60">
        <textarea
          ref={ref}
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, MAX_CHARS))}
          onKeyDown={onKeyDown}
          rows={1}
          dir="auto"
          maxLength={MAX_CHARS}
          placeholder={speech.listening ? t("listening") : t("placeholder")}
          aria-label={t("inputLabel")}
          className="field-sizing-content max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted"
        />
        {speech.supported && (
          <button
            type="button"
            onClick={() => {
              if (speech.listening) return speech.stop();
              beforeSpeech.current = text.trim();
              speech.start();
            }}
            aria-pressed={speech.listening}
            aria-label={speech.listening ? t("voiceStop") : t("voiceStart")}
            className={cn("grid size-9 shrink-0 place-items-center rounded-lg transition-colors", speech.listening ? "animate-pulse bg-danger/15 text-danger" : "text-muted hover:bg-surface hover:text-foreground")}
          >
            {speech.listening ? <MicOff className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
          </button>
        )}
        {busy ? (
          <button type="button" onClick={stop} aria-label={t("stop")} className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-foreground hover:bg-danger/15 hover:text-danger">
            <Square className="size-3.5 fill-current" aria-hidden />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label={t("send")}
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground transition-opacity disabled:opacity-40"
          >
            <SendHorizontal className="size-4 rtl:-scale-x-100" aria-hidden />
          </button>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[11px] text-muted">
        <span>{t("disclaimer")}</span>
        {text.length >= COUNTER_FROM && (
          <bdi dir="ltr" className={cn("shrink-0 font-mono", text.length >= MAX_CHARS && "text-danger")}>
            {t("charCount", { count: text.length })}
          </bdi>
        )}
      </div>
    </form>
  );
});
