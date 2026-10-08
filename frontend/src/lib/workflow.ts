import type { Vec3, Workflow, WorkflowNode } from "@/lib/api/types";

/**
 * In Arabic the workflow reads right → left: mirror X of positions and exploded offsets.
 * (Mirroring the scene with scale.x = -1 would also mirror text, so coordinates are flipped instead.)
 */
export function localizeWorkflow(workflow: Workflow, locale: string): Workflow {
  if (locale !== "ar") return workflow;

  const mirror = ([x, y, z]: Vec3): Vec3 => [x === 0 ? 0 : -x, y, z];

  return {
    ...workflow,
    nodes: workflow.nodes.map((node) => ({ ...node, position: mirror(node.position), exploded: mirror(node.exploded) })),
  };
}

/** Position of a node for a given explode progress (0 = assembled, 1 = exploded). */
export function nodePositionAt(node: WorkflowNode, progress: number): Vec3 {
  const t = Math.min(1, Math.max(0, progress));
  return [
    node.position[0] + node.exploded[0] * t,
    node.position[1] + node.exploded[1] * t,
    node.position[2] + node.exploded[2] * t,
  ];
}

/** Nodes in data-flow order (follows edges from the trigger), falling back to declaration order. */
export function orderedNodes(workflow: Workflow): WorkflowNode[] {
  const byId = new Map(workflow.nodes.map((node) => [node.id, node]));
  const targets = new Set(workflow.edges.map((edge) => edge.to));
  const start = workflow.nodes.find((node) => !targets.has(node.id)) ?? workflow.nodes[0];
  const ordered: WorkflowNode[] = [];
  const seen = new Set<string>();

  for (let current = start; current && !seen.has(current.id); ) {
    ordered.push(current);
    seen.add(current.id);
    const next = workflow.edges.find((edge) => edge.from === current!.id && !seen.has(edge.to));
    current = next ? byId.get(next.to)! : undefined!;
  }

  return [...ordered, ...workflow.nodes.filter((node) => !seen.has(node.id))];
}
