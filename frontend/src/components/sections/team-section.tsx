import Image from "next/image";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TeamMember } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GitHubIcon, LinkedInIcon, XIcon } from "@/components/ui/icons";
import { SectionShell } from "@/components/layout/section-shell";
import { CvPreviewDialog } from "./cv-preview-dialog";
import { SectionUnavailable } from "./section-unavailable";
import { TeamCvActions } from "./team-cv-actions";

const SOCIAL_ICONS = { linkedin: LinkedInIcon, github: GitHubIcon, x: XIcon, website: Globe } as const;

export function TeamSection({ team }: { team: TeamMember[] | null }) {
  const t = useTranslations("team");

  return (
    <SectionShell id="team" eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")}>
      {team === null ? (
        <SectionUnavailable />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((member) => (
            <li key={member.id}>
              <Card className="flex h-full flex-col gap-4 hover:border-pulse/50">
                {member.avatar_url && (
                  <Image
                    src={member.avatar_url}
                    alt=""
                    width={96}
                    height={96}
                    // Served by Laravel as small WebP already; the Next optimizer (inside Docker)
                    // can't reach the browser-facing API host, so load it directly.
                    unoptimized
                    className="size-20 rounded-full border-2 border-accent/50 object-cover"
                  />
                )}
                <div>
                  <h3 className="text-lg font-semibold">{member.name}</h3>
                  <p className="text-sm text-accent">{member.role}</p>
                </div>
                <p className="line-clamp-4 text-sm leading-relaxed text-muted">{member.bio}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {member.skills.slice(0, 4).map((skill) => (
                    <li key={skill}>
                      <Badge>{skill}</Badge>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto space-y-3">
                  <TeamCvActions member={member} />
                  <div className="flex gap-3 text-muted">
                    {Object.entries(member.social_links).map(([network, url]) => {
                      if (!(network in SOCIAL_ICONS) || !url) return null;
                      const Icon = SOCIAL_ICONS[network as keyof typeof SOCIAL_ICONS];
                      return (
                        <a key={network} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} — ${network}`} className="hover:text-pulse">
                          <Icon className="size-4" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <CvPreviewDialog />
    </SectionShell>
  );
}
