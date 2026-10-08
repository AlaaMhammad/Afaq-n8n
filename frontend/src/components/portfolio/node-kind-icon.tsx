import { Box, BrainCircuit, Database, GitFork, Zap, type LucideProps } from "lucide-react";
import type { NodeKind } from "@/lib/api/types";

const ICONS: Record<NodeKind, React.ComponentType<LucideProps>> = {
  trigger: Zap,
  router: GitFork,
  action: Box,
  ai: BrainCircuit,
  storage: Database,
};

/** Accent for triggers/actions, cyan for routing/AI/storage — matches the 3D materials. */
export const KIND_TONE: Record<NodeKind, "accent" | "pulse"> = {
  trigger: "accent",
  router: "pulse",
  action: "accent",
  ai: "pulse",
  storage: "pulse",
};

export function NodeKindIcon({ kind, ...props }: { kind: NodeKind } & LucideProps) {
  const Icon = ICONS[kind];
  return <Icon aria-hidden {...props} />;
}
