import { Check, Zap } from "lucide-react";
import type { WorkflowNode } from "@/lib/api/types";
import { iconForNodeType } from "@/lib/integrations";
import { cn } from "@/lib/utils";
import { IntegrationIcon } from "@/components/ui/integration-icon";

/** Integration name shown under a node, like n8n's subtitle row. */
export function nodeSubtitle(node: Pick<WorkflowNode, "n8nType" | "kind">): string {
  const icon = iconForNodeType(node.n8nType, node.kind);
  if (icon.kind === "brand") return icon.title;
  const key = node.n8nType.split(".").pop() ?? "";
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

interface N8nNodeBoxProps {
  node: WorkflowNode;
  /** Edge length of the square node body, px. */
  size: number;
  /** +1: inputs on the left, outputs on the right (n8n default); -1 mirrors for Arabic. */
  flow: 1 | -1;
  outputs: number;
  engaged: boolean;
  selected: boolean;
}

/**
 * One node drawn the way the n8n editor draws it: a dark rounded square with the integration's
 * icon, grey input/output handles on its sides, a green border + check once "executed", and —
 * for triggers — the rounded "D" body with the orange lightning marker.
 */
export function N8nNodeBox({ node, size, flow, outputs, engaged, selected }: N8nNodeBoxProps) {
  const icon = iconForNodeType(node.n8nType, node.kind);
  const trigger = node.kind === "trigger";
  const radius = Math.round(size * 0.14);
  const handle = Math.max(7, Math.round(size * 0.13));

  return (
    <span className="relative block" style={{ width: size, height: size }}>
      {trigger && (
        <Zap
          aria-hidden
          className="absolute top-1/2 -translate-y-1/2 fill-[#ff6d5a] text-[#ff6d5a]"
          style={{ width: size * 0.22, height: size * 0.22, [flow === 1 ? "left" : "right"]: -size * 0.34 }}
        />
      )}
      <span
        className={cn(
          "absolute inset-0 grid place-items-center border-2 bg-white shadow-[0_2px_10px_rgb(0_0_0/0.15)] transition-[border-color,box-shadow] duration-200 dark:bg-[#2e2e33] dark:shadow-[0_2px_10px_rgb(0_0_0/0.35)]",
          selected ? "border-accent shadow-glow-accent" : engaged ? "border-[#5bd87b]" : "border-[#3fb950]/80",
        )}
        style={{
          borderRadius: trigger
            ? flow === 1
              ? `${size / 2}px ${radius}px ${radius}px ${size / 2}px`
              : `${radius}px ${size / 2}px ${size / 2}px ${radius}px`
            : radius,
        }}
      >
        <IntegrationIcon icon={icon} style={{ width: size * 0.46, height: size * 0.46 }} />
        {/* "executed" badge, like n8n after a successful run */}
        <span className="absolute grid place-items-center rounded-full bg-[#3fb950] text-white" style={{ width: size * 0.2, height: size * 0.2, bottom: size * 0.06, [flow === 1 ? "right" : "left"]: size * 0.06 }}>
          <Check strokeWidth={3.5} style={{ width: size * 0.13, height: size * 0.13 }} aria-hidden />
        </span>
      </span>
      {/* handles */}
      {!trigger && <span className="absolute top-1/2 -translate-y-1/2 rounded-full bg-[#8a8a93]" style={{ width: handle, height: handle, [flow === 1 ? "left" : "right"]: -handle / 2 }} />}
      {Array.from({ length: outputs }, (_, i) => (
        <span
          key={i}
          className="absolute -translate-y-1/2 rounded-full bg-[#8a8a93]"
          style={{ width: handle, height: handle, top: `${((i + 1) / (outputs + 1)) * 100}%`, [flow === 1 ? "right" : "left"]: -handle / 2 }}
        />
      ))}
    </span>
  );
}
