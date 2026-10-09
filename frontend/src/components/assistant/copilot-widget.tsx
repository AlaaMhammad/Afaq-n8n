"use client";

import { useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MessageCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/stores/agent-store";

const CopilotPanel = dynamic(() => import("./copilot-panel"), { ssr: false });

/**
 * Afaq Copilot: a floating launcher and a non-modal chat panel (full-screen sheet on phones).
 * Ctrl/⌘+K toggles it, Esc closes it, focus moves into the composer on open and back to the
 * launcher on close. Streaming, actions and retries live in the agent store. The panel's code
 * loads on first open, or while the browser is idle, so it never weighs on first paint.
 */
export function CopilotWidget() {
  const t = useTranslations("copilot");
  const isOpen = useAgentStore((s) => s.isOpen);
  const unread = useAgentStore((s) => s.unread);
  const toggle = useAgentStore((s) => s.toggle);
  const panelId = useId();
  const titleId = useId();
  const launcher = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const [everOpened, setEverOpened] = useState(false);
  const mountPanel = everOpened || isOpen;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        useAgentStore.getState().toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
      const timer = setTimeout(() => setEverOpened(true), 0);
      return () => clearTimeout(timer);
    }
    if (wasOpen.current) launcher.current?.focus({ preventScroll: true });
  }, [isOpen]);

  // Warm the panel chunk once the page is idle, so the first open feels instant.
  useEffect(() => {
    const warm = () => void import("./copilot-panel");
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(warm, { timeout: 5000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(warm, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {mountPanel && <CopilotPanel panelId={panelId} titleId={titleId} />}

      <button
        ref={launcher}
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-label={isOpen ? t("close") : t("open")}
        title={`${t("name")} (${t("shortcut")})`}
        className={cn(
          "copilot-launcher fixed bottom-6 end-6 z-40 grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-glow-accent transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isOpen && "max-sm:hidden",
        )}
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        {isOpen ? <X className="size-6" aria-hidden /> : <MessageCircle className="size-6" aria-hidden />}
        {!isOpen && unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-pulse px-1 font-mono text-[11px] font-bold text-black" aria-hidden>
            {unread}
          </span>
        )}
      </button>
    </>
  );
}
