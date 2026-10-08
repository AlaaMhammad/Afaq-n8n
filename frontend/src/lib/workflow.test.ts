import { describe, expect, it } from "vitest";
import type { Workflow } from "@/lib/api/types";
import { localizeWorkflow, nodePositionAt, orderedNodes } from "./workflow";

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
