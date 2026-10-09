"use client";

import { memo } from "react";
import { AlertTriangle, Bot, Boxes, CheckCircle2, Compass, Copy, Loader2, RefreshCw, RotateCcw, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { AgentAction } from "@/lib/agent/actions";
import { cn } from "@/lib/utils";
import { useAgentStore, type ChatMessage, type ToolActivity } from "@/stores/agent-store";
import { useSceneStore } from "@/stores/scene-store";
import { Markdown } from "./markdown";
import { copilotErrorKey, isRetryable } from "./problem-message";

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

interface MessageBubbleProps {
  message: ChatMessage;
  /** Only the latest failed answer offers Retry. */
  isLast: boolean;
  onRetry: () => void;
}

export const MessageBubble = memo(function MessageBubble({ message, isLast, onRetry }: MessageBubbleProps) {
  const t = useTranslations("copilot");

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p dir="auto" className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-ee-md bg-accent px-3.5 py-2 text-sm text-accent-foreground">
          {message.content}
        </p>
      </div>
    );
  }

  const streaming = message.status === "streaming";
  const thinking = streaming && message.content === "" && !(message.tools ?? []).some((tool) => tool.status === "running");

  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-pulse/15 text-pulse" aria-hidden>
        <Bot className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        {thinking ? (
          <p className="inline-flex items-center gap-1.5 rounded-2xl rounded-ss-md bg-surface-2 px-3.5 py-2.5 text-sm text-muted">
            <span className="flex gap-1" aria-hidden>
              <span className="size-1.5 animate-bounce rounded-full bg-pulse [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-pulse [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-pulse" />
            </span>
            <span className="sr-only">{t("thinking")}</span>
          </p>
        ) : (
          message.content !== "" && (
            <div className={cn("rounded-2xl rounded-ss-md bg-surface-2 px-3.5 py-2.5 text-sm", streaming && "copilot-caret")}>
              <Markdown>{message.content}</Markdown>
            </div>
          )
        )}

        {(message.tools ?? []).map((tool) => (
          <ToolLine key={tool.id} tool={tool} />
        ))}

        {(message.actions ?? []).length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {message.actions!.map((action) => (
              <li key={action.id}>
                <ActionChip action={action} />
              </li>
            ))}
          </ul>
        )}

        {message.sources && message.sources.length > 0 && message.status !== "streaming" && (
          <details className="group text-xs text-muted">
            <summary className="cursor-pointer select-none list-none hover:text-foreground [&::-webkit-details-marker]:hidden">
              {t("sources")} ({message.sources.length})
            </summary>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {message.sources.map((source) => (
                <li key={source.document_id} className="rounded-md border border-border bg-surface px-2 py-0.5" dir="auto">
                  {source.title} <bdi dir="ltr" className="font-mono text-pulse">{Math.round(source.score * 100)}%</bdi>
                </li>
              ))}
            </ul>
          </details>
        )}

        {message.status === "error" && (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-foreground">
            <AlertTriangle className="size-4 shrink-0 text-danger" aria-hidden />
            <span className="flex-1">{t(`errors.${copilotErrorKey(message.problem)}`, { seconds: message.problem?.retry_after ?? 30 })}</span>
            {isLast && isRetryable(message.problem) && (
              <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-pulse hover:bg-pulse/10">
                <RotateCcw className="size-3.5" aria-hidden /> {t("retry")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

function ToolLine({ tool }: { tool: ToolActivity }) {
  const t = useTranslations("copilot.tools");
  if (tool.status === "ok") return null; // the resulting action chip tells the story
  const known = ["submit_service_inquiry", "navigate_to", "trigger_3d_workflow"].includes(tool.name);
  const label = tool.status === "failed" ? t("failed") : known ? t(tool.name as "navigate_to") : t("default");

  return (
    <p className={cn("inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs", tool.status === "failed" ? "border-border text-muted" : "border-pulse/40 text-pulse")} role="status">
      {tool.status === "running" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <XCircle className="size-3.5" aria-hidden />}
      {label}
    </p>
  );
}

/** What the agent did on the page, with a one-click way to do it again. */
function ActionChip({ action }: { action: AgentAction }) {
  const t = useTranslations();
  const enqueue = useAgentStore((s) => s.enqueueAction);
  const projectTitle = useSceneStore((s) => (action.type === "trigger_3d_workflow" ? (s.projectTitles[action.payload.projectSlug] ?? action.payload.projectSlug) : ""));

  let icon = <Compass className="size-4" aria-hidden />;
  let label: string;
  let button: { label: string; icon: React.ReactNode; run: () => void };

  switch (action.type) {
    case "navigate_to":
      label = t("copilot.bubbles.navigated", { section: t(`nav.${action.payload.sectionId}`) });
      button = { label: t("copilot.bubbles.goAgain"), icon: <RefreshCw className="size-3.5" aria-hidden />, run: () => enqueue({ ...action, id: newId() }) };
      break;
    case "trigger_3d_workflow": {
      icon = <Boxes className="size-4" aria-hidden />;
      label = t("copilot.bubbles.workflow", { project: projectTitle, mode: t(`copilot.modes.${action.payload.mode}`) });
      button = {
        label: t("copilot.bubbles.toggle"),
        icon: <RefreshCw className="size-3.5" aria-hidden />,
        // Flip the view if this project is on screen; otherwise bring it back as the agent showed it.
        run: () => {
          const scene = useSceneStore.getState();
          const showing = scene.activeProjectSlug === action.payload.projectSlug;
          const mode = showing ? (scene.mode === "exploded" ? "assembled" : "exploded") : action.payload.mode;
          enqueue({ ...action, id: newId(), payload: { ...action.payload, mode } });
        },
      };
      break;
    }
    case "service_inquiry_submitted":
      icon = <CheckCircle2 className="size-4 text-success" aria-hidden />;
      label = t("copilot.bubbles.inquiry", { reference: action.payload.reference });
      button = {
        label: t("copilot.bubbles.copyRef"),
        icon: <Copy className="size-3.5" aria-hidden />,
        run: () => {
          void navigator.clipboard?.writeText(action.payload.reference).then(() => toast.success(t("copilot.bubbles.copied")));
        },
      };
      break;
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
      <span className="text-accent">{icon}</span>
      <span className="min-w-0 flex-1 font-medium" dir="auto">
        {label}
      </span>
      <button type="button" onClick={button.run} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-semibold text-pulse hover:bg-pulse/10">
        {button.icon}
        {button.label}
      </button>
    </div>
  );
}
