import { cacheLife, cacheTag } from "next/cache";
import type { Locale } from "@/i18n/routing";
import { apiFetch } from "./client";
import type { Project, Service, TeamMember } from "./types";

/*
 * Server-side content fetchers. Cached with `use cache` so they become part of the
 * prerendered static shell (Cache Components); refreshed every few minutes.
 * The locale argument is part of the cache key. Errors are never cached.
 */

export async function getServices(locale: Locale): Promise<Service[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("services");
  return apiFetch<Service[]>("services", { locale });
}

export async function getProjects(locale: Locale): Promise<Project[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("projects");
  return apiFetch<Project[]>("projects", { locale });
}

export async function getTeam(locale: Locale): Promise<TeamMember[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("team");
  return apiFetch<TeamMember[]>("team", { locale });
}

/** Never let an unavailable API take the whole page down — sections render an empty state. */
export async function safely<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    console.error("[content] API unavailable:", error instanceof Error ? error.message : error);
    return null;
  }
}
