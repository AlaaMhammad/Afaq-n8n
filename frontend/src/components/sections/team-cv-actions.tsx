"use client";

import { Download, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TeamMember } from "@/lib/api/types";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";

export function TeamCvActions({ member }: { member: TeamMember }) {
  const t = useTranslations("team");
  const openCvPreview = useUiStore((s) => s.openCvPreview);
  if (!member.cv) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" onClick={() => openCvPreview({ memberId: member.id, name: member.name, url: member.cv!.preview_url })}>
        <Eye /> {t("previewCv")}
      </Button>
      <Button asChild size="sm" variant="ghost">
        <a href={member.cv.download_url} download>
          <Download /> {t("downloadCv")}
        </a>
      </Button>
    </div>
  );
}
