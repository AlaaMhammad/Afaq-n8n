import { z } from "zod";

/**
 * UI actions the AI agent may trigger (SSE `action` events). Every payload is validated
 * here before it touches the stores — unknown or malformed actions are dropped.
 * Spec: docs/01_architecture/state_management.md §4
 */

export const SECTION_IDS = ["hero", "services", "portfolio", "team", "order"] as const;

const navigateTo = z.object({
  id: z.string(),
  type: z.literal("navigate_to"),
  payload: z.object({ sectionId: z.enum(SECTION_IDS) }),
});

const trigger3dWorkflow = z.object({
  id: z.string(),
  type: z.literal("trigger_3d_workflow"),
  payload: z.object({
    projectSlug: z.string().regex(/^[a-z0-9-]+$/),
    mode: z.enum(["assembled", "exploded"]),
  }),
});

const inquirySubmitted = z.object({
  id: z.string(),
  type: z.literal("service_inquiry_submitted"),
  payload: z.object({ reference: z.string().regex(/^AFQ-[0-9A-Z]{6}$/), serviceType: z.string() }),
});

export const agentActionSchema = z.discriminatedUnion("type", [navigateTo, trigger3dWorkflow, inquirySubmitted]);

export type AgentAction = z.infer<typeof agentActionSchema>;
export type AgentActionType = AgentAction["type"];

export function parseAgentAction(input: unknown): AgentAction | null {
  const result = agentActionSchema.safeParse(input);
  return result.success ? result.data : null;
}
