import Image from "next/image";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TeamMember } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { GitHubIcon, LinkedInIcon, XIcon } from "@/components/ui/icons";
import { TiltCard } from "@/components/ui/tilt-card";
import { SectionShell } from "@/components/layout/section-shell";
import { BilingualBio } from "./bilingual-bio";
import { CvPreviewDialog } from "./cv-preview-dialog";
import { SectionUnavailable } from "./section-unavailable";
import { TeamCvActions } from "./team-cv-actions";

const SOCIAL_ICONS = { linkedin: LinkedInIcon, github: GitHubIcon, x: XIcon, website: Globe } as const;

interface TeamSectionProps {
  team: TeamMember[] | null;
  /** The same members resolved in the other language, for the bio switch. */
  alternate?: TeamMember[] | null;
}

/** "The Minds Behind the Magic": tilt cards with bilingual bios, skills, socials and CV preview/download. */
export function TeamSection({ team, alternate = null }: TeamSectionProps) {
  const t = useTranslations("team");
  const alternateById = new Map((alternate ?? []).map((member) => [member.id, member]));

  return (
    <SectionShell id="team" eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")}>
      {team === null ? (
        <SectionUnavailable />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((member) => {
            const other = alternateById.get(member.id);
            return (
              <li key={member.id}>
                <TiltCard className="flex flex-col gap-4">
                  <div className="flex items-center gap-4" data-depth>
                    {member.avatar_url ? (
                      <Image
                        src={member.avatar_url}
                        alt=""
                        width={96}
                        height={96}
                        // Served by Laravel as small WebP already; the Next optimizer (inside Docker)
                        // can't reach the browser-facing API host, so load it directly.
                        unoptimized
                        className="size-20 shrink-0 rounded-2xl border-2 border-accent/50 object-cover shadow-glow-accent"
                      />
                    ) : (
                      <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-accent/10 text-2xl font-bold text-accent" aria-hidden>
                        {member.name.charAt(0)}
                      </span>
                    )}
                    <h3 className="text-lg font-semibold leading-snug">{member.name}</h3>
                  </div>

                  <BilingualBio bio={member.bio} role={member.role} alternate={other ? { bio: other.bio, role: other.role } : null} />

                  {member.skills.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5" aria-label={t("skills")}>
                      {member.skills.slice(0, 5).map((skill) => (
                        <li key={skill}>
                          <Badge>{skill}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-auto space-y-3 pt-2">
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
                </TiltCard>
              </li>
            );
          })}
        </ul>
      )}
      <CvPreviewDialog />
    </SectionShell>
  );
}
