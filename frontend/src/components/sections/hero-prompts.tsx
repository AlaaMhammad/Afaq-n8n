"use client";

import { MessageCircle, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAgentStore } from "@/stores/agent-store";
import { Button } from "@/components/ui/button";

const PROMPTS = ["invoice", "whatsapp", "cost"] as const;

/** Opens the Copilot (optionally with a ready-made question) — the hero's live demo of the AI → page bridge. */
export function AskCopilotButton({ prompt, children, ...props }: { prompt?: string } & React.ComponentProps<typeof Button>) {
  const locale = useLocale() as "ar" | "en";
  const ask = useAgentStore((s) => s.ask);
  const open = useAgentStore((s) => s.open);

  return (
    <Button {...props} onClick={() => (prompt ? void ask(prompt, locale) : open())}>
      {children}
    </Button>
  );
}

export function HeroPrompts() {
  const t = useTranslations("hero");
  const locale = useLocale() as "ar" | "en";
  const ask = useAgentStore((s) => s.ask);
  const busy = useAgentStore((s) => s.status === "connecting" || s.status === "streaming");

  return (
    <div className="mt-8">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <Sparkles className="size-3.5 text-pulse" aria-hidden />
        {t("tryAsking")}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {PROMPTS.map((key) => (
          <li key={key}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void ask(t(`prompts.${key}`), locale)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3.5 py-1.5 text-sm text-foreground backdrop-blur-sm transition-colors hover:border-pulse/60 hover:text-pulse disabled:opacity-50"
            >
              <MessageCircle className="size-3.5 text-pulse" aria-hidden />
              {t(`prompts.${key}`)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
