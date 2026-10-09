import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { BookingSection } from "@/components/sections/booking-section";
import { HeroSection } from "@/components/sections/hero-section";
import { PortfolioSection } from "@/components/sections/portfolio-section";
import { ServicesSection } from "@/components/sections/services-section";
import { TeamSection } from "@/components/sections/team-section";
import { routing } from "@/i18n/routing";
import { getProjects, getServices, getTeam, safely } from "@/lib/api/content";

/**
 * One-page site. Content comes from the Laravel API through cached fetchers, so both
 * locales are prerendered; an unreachable API degrades a section, never the page.
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const otherLocale = locale === "ar" ? "en" : "ar";
  const [services, projects, team, teamInOtherLocale] = await Promise.all([
    safely(() => getServices(locale)),
    safely(() => getProjects(locale)),
    safely(() => getTeam(locale)),
    // Lets each bio switch to the other language without a client request.
    safely(() => getTeam(otherLocale)),
  ]);

  return (
    <>
      <HeroSection projects={projects} />
      <ServicesSection services={services} />
      <PortfolioSection projects={projects} />
      <TeamSection team={team} alternate={teamInOtherLocale} />
      <BookingSection services={services} />
    </>
  );
}
