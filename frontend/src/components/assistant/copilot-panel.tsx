"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { MessageCircle, SquarePen, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/stores/agent-store";
import { Composer } from "./composer";
import { MessageList } from "./message-list";

/**
 * The Copilot chat panel. Loaded on first open (markdown rendering, motion and the composer stay
 * out of the initial page bundle), then kept mounted so it can animate in and out.
 */
export default function CopilotPanel({ panelId, titleId }: { panelId: string; titleId: string }) {
  const t = useTranslations("copilot");
  const isOpen = useAgentStore((s) => s.isOpen);
  const busy = useAgentStore((s) => s.status === "connecting" || s.status === "streaming");
  const hasMessages = useAgentStore((s) => s.messages.length > 0);
  const close = useAgentStore((s) => s.close);
  const reset = useAgentStore((s) => s.reset);
  const composer = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    void useAgentStore.getState().restoreFromServer();
    // After the open animation has mounted the panel.
    const timer = setTimeout(() => composer.current?.focus({ preventScroll: true }), 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {isOpen && (
          <motion.section
            key="copilot"
            id={panelId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                close();
              }
            }}
            className={cn(
              "copilot-panel fixed z-40 flex flex-col overflow-hidden border-pulse/30 bg-surface/90 shadow-2xl backdrop-blur-xl",
              // Phone: full-screen sheet. Larger: a docked panel above the launcher.
              "inset-0 sm:inset-auto sm:end-6 sm:bottom-24 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[400px] sm:rounded-2xl sm:border",
              "origin-bottom-right rtl:origin-bottom-left",
            )}
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <header className="flex items-center gap-3 border-b border-border px-4 py-3">
              <span className="relative grid size-9 place-items-center rounded-xl bg-accent/15 text-accent" aria-hidden>
                <MessageCircle className="size-5" />
                <span className="absolute -end-0.5 -top-0.5 size-2.5 rounded-full border-2 border-surface bg-pulse shadow-glow-pulse" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-sm font-semibold">
                  {t("name")}
                </h2>
                <p className="truncate text-xs text-muted">{busy ? t("thinking") : t("tagline")}</p>
              </div>
              {hasMessages && (
                <button
                  type="button"
                  onClick={reset}
                  aria-label={t("newChat")}
                  title={t("newChat")}
                  className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
                >
                  <SquarePen className="size-4" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={close}
                aria-label={t("close")}
                className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </header>
            <MessageList />
            <Composer ref={composer} />
          </motion.section>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
