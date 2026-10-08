/**
 * Shapes returned by the Laravel API (docs/02_api_specs/endpoints.md).
 * Translatable fields arrive already resolved to the requested locale.
 */

export type NodeKind = "trigger" | "router" | "action" | "ai" | "storage";
export type Vec3 = [number, number, number];
export type WorkflowMode = "assembled" | "exploded";
export type SectionId = "hero" | "services" | "portfolio" | "team" | "order";

export interface Service {
  id: number;
  slug: string;
  title: string;
  description: string;
  icon: string | null;
  features: string[];
  starting_price: number | null;
  order: number;
}

export interface WorkflowNode {
  id: string;
  kind: NodeKind;
  label: string;
  n8nType: string;
  position: Vec3;
  exploded: Vec3;
  color?: string;
  stats?: { avgMs: number; executions: number };
}

export interface WorkflowEdge {
  from: string;
  to: string;
  fromPort?: string;
  label?: string;
  animated?: boolean;
}

export interface Workflow {
  version: number;
  camera: { position: Vec3; target: Vec3 } | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface ProjectMetrics {
  avgExecutionMs: number;
  failureRate: number;
  nodesCount: number;
  monthlyRuns: number;
  hoursSavedPerMonth: number;
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  client: string;
  summary: string;
  metrics: ProjectMetrics;
  workflow: Workflow;
  services: { slug: string; title: string }[];
  live_url: string | null;
  cover_url: string | null;
  is_featured: boolean;
  order: number;
}

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  bio: string;
  avatar_url: string | null;
  cv: { preview_url: string; download_url: string } | null;
  skills: string[];
  social_links: Partial<Record<"linkedin" | "github" | "x" | "website", string>>;
  order: number;
}

export type BudgetRange = "lt_1k" | "1k_5k" | "5k_15k" | "15k_50k" | "gt_50k";
export type Timeline = "asap" | "1_month" | "1_3_months" | "flexible";

export interface Estimate {
  min: number;
  max: number;
  currency: "USD";
  weeks: [number, number];
  exceeds_budget?: boolean;
}

export interface ServiceRequestInput {
  client_name: string;
  client_email: string;
  client_phone?: string;
  company?: string;
  service_slug?: string;
  budget_range: BudgetRange;
  timeline?: Timeline;
  complexity?: number;
  requirements: string;
  locale: "ar" | "en";
  consent: boolean;
  website?: string; // honeypot — keep empty
}

export interface ServiceRequestCreated {
  reference: string;
  status: string;
  estimate: Estimate | null;
}

/** RFC 7807 problem details (docs/02_api_specs/error_handling.md). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code: string;
  request_id?: string;
  errors?: Record<string, string[]>;
  retry_after?: number;
  reference?: string;
}
