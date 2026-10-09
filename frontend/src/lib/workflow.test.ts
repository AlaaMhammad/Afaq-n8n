import { describe, expect, it } from "vitest";
import type { Workflow } from "@/lib/api/types";
import { localizeWorkflow, mainEdges, nodePositionAt, orderedNodes, subNodeIds } from "./workflow";

const workflow: Workflow = {
  version: 1,
  camera: null,
  nodes: [
    { id: "router", kind: "router", label: "Router", n8nType: "switch", position: [1.5, 0, 0], exploded: [0.6, 1.5, -0.9] },
    { id: "webhook", kind: "trigger", label: "Webhook", n8nType: "webhook", position: [-4.5, 0, -0.6], exploded: [-1.5, 1.2, 0.8] },
    { id: "ticket", kind: "action", label: "Ticket", n8nType: "zendesk", position: [4.5, 0, -0.6], exploded: [1.6, -1, 0.7] },
  ],
  edges: [
    { from: "webhook", to: "router" },
    { from: "router", to: "ticket" },
  ],
};

describe("workflow helpers", () => {
  it("mirrors X for Arabic only", () => {
    expect(localizeWorkflow(workflow, "en")).toBe(workflow);
    const ar = localizeWorkflow(workflow, "ar");
    expect(ar.nodes[1].position).toEqual([4.5, 0, -0.6]);
    expect(ar.nodes[1].exploded).toEqual([1.5, 1.2, 0.8]);
  });

  it("interpolates exploded positions", () => {
    expect(nodePositionAt(workflow.nodes[0], 0)).toEqual([1.5, 0, 0]);
    expect(nodePositionAt(workflow.nodes[0], 1)).toEqual([2.1, 1.5, -0.9]);
    expect(nodePositionAt(workflow.nodes[0], 2)).toEqual(nodePositionAt(workflow.nodes[0], 1));
  });

  it("orders nodes along the data flow", () => {
    expect(orderedNodes(workflow).map((n) => n.id)).toEqual(["webhook", "router", "ticket"]);
  });
});

describe("branching workflows with AI sub-nodes", () => {
  const node = (id: string, kind: "trigger" | "router" | "action" | "ai" | "storage" = "action") => ({ id, kind, label: id, n8nType: "x", position: [0, 0, 0] as [number, number, number], exploded: [0, 0, 0] as [number, number, number] });
  const workflow = {
    version: 1,
    camera: null,
    nodes: [node("form", "trigger"), node("check", "router"), node("dup"), node("agent", "ai"), node("model", "ai"), node("memory", "storage"), node("mail")],
    edges: [
      { from: "form", to: "check" },
      { from: "check", to: "dup", fromPort: "true" },
      { from: "check", to: "agent", fromPort: "false" },
      { from: "model", to: "agent", type: "ai" as const },
      { from: "memory", to: "agent", type: "ai" as const },
      { from: "agent", to: "mail" },
    ],
  };

  it("walks every branch from the trigger and lists sub-nodes right after their agent", () => {
    expect(orderedNodes(workflow).map((n) => n.id)).toEqual(["form", "check", "dup", "agent", "model", "memory", "mail"]);
  });

  it("separates data connections from AI attachments", () => {
    expect(mainEdges(workflow)).toHaveLength(4);
    expect([...subNodeIds(workflow)]).toEqual(["model", "memory"]);
  });
});
