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

/** Data connections only (AI sub-node attachments excluded). */
export const mainEdges = (workflow: Pick<Workflow, "edges">) => workflow.edges.filter((edge) => edge.type !== "ai");

/** Ids of AI sub-nodes (models, memory, tools) — drawn round, attached under their agent like in n8n. */
export const subNodeIds = (workflow: Pick<Workflow, "edges">) => new Set(workflow.edges.filter((edge) => edge.type === "ai").map((edge) => edge.from));

/**
 * Nodes in data-flow order: a depth-first walk of the data connections from the trigger (every branch,
 * in output order), each AI sub-node right after the node it serves, then anything unreached.
 */
export function orderedNodes(workflow: Workflow): WorkflowNode[] {
  const byId = new Map(workflow.nodes.map((node) => [node.id, node]));
  const main = mainEdges(workflow);
  const subs = subNodeIds(workflow);
  const targets = new Set(main.map((edge) => edge.to));
  const start = workflow.nodes.find((node) => !targets.has(node.id) && !subs.has(node.id)) ?? workflow.nodes[0];
  const ordered: WorkflowNode[] = [];
  const seen = new Set<string>();

  const visit = (node: WorkflowNode | undefined) => {
    if (!node || seen.has(node.id)) return;
    seen.add(node.id);
    ordered.push(node);
    for (const edge of workflow.edges) if (edge.type === "ai" && edge.to === node.id) visit(byId.get(edge.from));
    for (const edge of main) if (edge.from === node.id) visit(byId.get(edge.to));
  };
  visit(start);

  return [...ordered, ...workflow.nodes.filter((node) => !seen.has(node.id))];
}
