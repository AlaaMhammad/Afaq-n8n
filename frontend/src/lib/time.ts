import { cacheLife } from "next/cache";

/** Current year for the footer — cached so prerendered pages don't read the clock at request time. */
export async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
