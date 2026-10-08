import { useTranslations } from "next-intl";
import type { Project } from "@/lib/api/types";
import { SectionShell } from "@/components/layout/section-shell";
import { PortfolioExplorer } from "./portfolio-explorer";
import { SectionUnavailable } from "./section-unavailable";

export function PortfolioSection({ projects }: { projects: Project[] | null }) {
  const t = useTranslations("portfolio");

  return (
    <SectionShell id="portfolio" eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")}>
      {projects === null || projects.length === 0 ? <SectionUnavailable /> : <PortfolioExplorer projects={projects} />}
    </SectionShell>
  );
}
