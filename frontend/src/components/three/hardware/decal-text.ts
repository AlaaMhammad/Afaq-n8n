import type { NodeKind } from "@/lib/api/types";

/** Integration names for the n8n node types the portfolio uses (nominative text only, no logos). */
const KNOWN: Record<string, string> = {
  webhook: "WEBHOOK",
  emailReadImap: "IMAP",
  formTrigger: "FORM",
  postgres: "POSTGRES",
  whatsApp: "WHATSAPP",
  zendesk: "ZENDESK",
  hubspot: "HUBSPOT",
  clearbit: "CLEARBIT",
  switch: "SWITCH",
  filter: "FILTER",
  sentimentAnalysis: "SENTIMENT",
  informationExtractor: "EXTRACTOR",
  httpRequest: "HTTP",
  slack: "SLACK",
  googleSheets: "SHEETS",
};

/**
 * Short uppercase integration name for a node's decal, from its n8n type
 * (`n8n-nodes-base.emailReadImap` → `IMAP`, `n8n-nodes-base.fooBarBaz` → `FOO BAR BAZ`).
 */
export function integrationName(n8nType: string): string {
  const key = n8nType.split(".").pop() ?? n8nType;
  if (KNOWN[key]) return KNOWN[key];
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, 14);
}

/** Port layout per node kind: triggers only emit, routers fan out to several outputs. */
export function portCounts(kind: NodeKind): { inputs: number; outputs: number } {
  switch (kind) {
    case "trigger":
      return { inputs: 0, outputs: 1 };
    case "router":
      return { inputs: 1, outputs: 3 };
    case "storage":
      return { inputs: 1, outputs: 1 };
    default:
      return { inputs: 1, outputs: 1 };
  }
}

/** Two-letter monogram for a person's hardware chip (works for Arabic and Latin names). */
export function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}
