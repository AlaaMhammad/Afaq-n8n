import { describe, expect, it } from "vitest";
import { connectionPath, outputCount, subConnectionPath } from "@/components/portfolio/workflow-diagram-2d";
import { nodeSubtitle } from "@/components/portfolio/n8n-node";
import type { Workflow } from "@/lib/api/types";
import { BRAND_ICONS, brandFromIconName, displayColor, iconForNodeType, N8N_LOGO } from ".";

describe("integration icons", () => {
  it("maps n8n node types to real brand marks or n8n core glyphs", () => {
    expect(iconForNodeType("n8n-nodes-base.whatsApp")).toMatchObject({ kind: "brand", title: "WhatsApp", hex: "#25D366" });
    expect(iconForNodeType("n8n-nodes-base.postgres")).toMatchObject({ kind: "brand", title: "PostgreSQL" });
    expect(iconForNodeType("@n8n/n8n-nodes-langchain.lmChatGoogleGemini")).toMatchObject({ kind: "brand", title: "Google Gemini" });
    expect(iconForNodeType("n8n-nodes-base.webhook")).toMatchObject({ kind: "core", name: "webhook" });
    expect(iconForNodeType("n8n-nodes-base.if")).toMatchObject({ kind: "core", name: "split" });
    // Unknown types fall back by node kind
    expect(iconForNodeType("n8n-nodes-base.somethingNew", "storage")).toMatchObject({ kind: "core", name: "database" });
  });

  it("resolves brand icon names stored on services and keeps lucide names untouched", () => {
    expect(brandFromIconName("brand:hubspot")).toBe(BRAND_ICONS.hubspot);
    expect(brandFromIconName("workflow")).toBeNull();
    expect(brandFromIconName("brand:unknown")).toBeNull();
    expect(N8N_LOGO).toMatchObject({ kind: "brand", hex: "#EA4B71" });
  });

  it("lifts brand colours that would vanish on the current theme", () => {
    expect(displayColor("#03363D", "dark")).toBe("#e6e6e6"); // Zendesk on dark
    expect(displayColor("#25D366", "dark")).toBe("#25D366");
    expect(displayColor("#FFFFFF", "light")).toBe("#1f1f24");
  });

  it("subtitles nodes like n8n does", () => {
    expect(nodeSubtitle({ n8nType: "n8n-nodes-base.gmail", kind: "action" })).toBe("Gmail");
    expect(nodeSubtitle({ n8nType: "n8n-nodes-base.emailReadImap", kind: "trigger" })).toBe("Email Read Imap");
  });
});

describe("n8n canvas geometry", () => {
  const workflow: Workflow = {
    version: 1,
    camera: null,
    nodes: [
      { id: "t", kind: "trigger", label: "T", n8nType: "n8n-nodes-base.webhook", position: [-3, 0, 0], exploded: [0, 0, 0] },
      { id: "r", kind: "router", label: "R", n8nType: "n8n-nodes-base.if", position: [0, 0, 0], exploded: [0, 0, 0] },
      { id: "a", kind: "action", label: "A", n8nType: "n8n-nodes-base.gmail", position: [3, 1, 0], exploded: [0, 0, 0] },
      { id: "b", kind: "action", label: "B", n8nType: "n8n-nodes-base.gmail", position: [3, -1, 0], exploded: [0, 0, 0] },
      { id: "c", kind: "action", label: "C", n8nType: "n8n-nodes-base.gmail", position: [3, -2, 0], exploded: [0, 0, 0] },
    ],
    edges: [
      { from: "t", to: "r" },
      { from: "r", to: "a", fromPort: "true" },
      { from: "r", to: "b", fromPort: "false" },
      { from: "c", to: "r", type: "ai" },
    ],
  };

  it("gives routers at least two output handles and every node at least one", () => {
    expect(outputCount(workflow, "r", "router")).toBe(2);
    expect(outputCount(workflow, "t", "trigger")).toBe(1);
    expect(outputCount(workflow, "c", "action")).toBe(1); // its AI attachment is not a data output
  });

  it("draws connections that leave and enter handles horizontally, mirrored in RTL", () => {
    expect(connectionPath({ x: 0, y: 0 }, { x: 100, y: 40 }, 1)).toBe("M0.0 0.0 C50.0 0.0 50.0 40.0 100.0 40.0");
    expect(connectionPath({ x: 0, y: 0 }, { x: -100, y: 0 }, -1)).toBe("M0.0 0.0 C-50.0 0.0 -50.0 0.0 -100.0 0.0");
  });

  it("attaches AI sub-nodes vertically, from the sub-node's top into the agent's bottom", () => {
    expect(subConnectionPath({ x: 0, y: 100 }, { x: 40, y: 20 })).toBe("M0.0 100.0 C0.0 60.0 40.0 60.0 40.0 20.0");
  });
});
