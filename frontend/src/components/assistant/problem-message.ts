import type { ProblemDetails } from "@/lib/api/types";

/** Problem codes the Copilot explains in the visitor's language; anything else is "generic". */
export const COPILOT_ERROR_CODES = [
  "RATE_LIMITED",
  "NETWORK_ERROR",
  "STREAM_INTERRUPTED",
  "PROMPT_REJECTED",
  "AI_PROVIDER_ERROR",
  "AI_TIMEOUT",
  "SERVICE_UNAVAILABLE",
  "VALIDATION_FAILED",
] as const;

export type CopilotErrorKey = (typeof COPILOT_ERROR_CODES)[number] | "generic";

export function copilotErrorKey(problem: Pick<ProblemDetails, "code"> | null | undefined): CopilotErrorKey {
  const code = problem?.code;
  return code && (COPILOT_ERROR_CODES as readonly string[]).includes(code) ? (code as CopilotErrorKey) : "generic";
}

/** A prompt the model refused will be refused again — retrying it is pointless. */
export const isRetryable = (problem: Pick<ProblemDetails, "code"> | null | undefined) => copilotErrorKey(problem) !== "PROMPT_REJECTED";
