import { apiBaseUrl } from "@/lib/env";
import type { ProblemDetails } from "./types";

/** An API call that failed with an RFC 7807 problem (or a network error mapped to one). */
export class ApiError extends Error {
  constructor(public readonly problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = "ApiError";
  }

  get code(): string {
    return this.problem.code;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  locale?: "ar" | "en";
  query?: Record<string, string | number | undefined>;
  json?: unknown;
}

/**
 * Typed fetch against the Laravel API. Resolves to the `data` member of the envelope;
 * rejects with ApiError carrying the problem details.
 */
export async function apiFetch<T>(path: string, { locale, query, json, headers, ...init }: RequestOptions = {}): Promise<T> {
  const url = new URL(`${apiBaseUrl()}/${path.replace(/^\//, "")}`);
  if (locale) url.searchParams.set("locale", locale);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      method: init.method ?? (json === undefined ? "GET" : "POST"),
      headers: {
        Accept: "application/json",
        ...(json === undefined ? {} : { "Content-Type": "application/json" }),
        ...(locale ? { "Accept-Language": locale } : {}),
        ...headers,
      },
      body: json === undefined ? undefined : JSON.stringify(json),
    });
  } catch (cause) {
    throw new ApiError({
      type: "about:blank",
      title: "Network error",
      status: 0,
      code: "NETWORK_ERROR",
      detail: cause instanceof Error ? cause.message : String(cause),
    });
  }

  if (!response.ok) {
    throw new ApiError(await readProblem(response));
  }

  const body = (await response.json()) as { data: T };
  return body.data;
}

export async function readProblem(response: Response): Promise<ProblemDetails> {
  try {
    const problem = (await response.json()) as Partial<ProblemDetails>;
    return {
      type: problem.type ?? "about:blank",
      title: problem.title ?? response.statusText,
      status: problem.status ?? response.status,
      code: problem.code ?? `HTTP_${response.status}`,
      ...problem,
    } as ProblemDetails;
  } catch {
    return { type: "about:blank", title: response.statusText || "Error", status: response.status, code: `HTTP_${response.status}` };
  }
}
