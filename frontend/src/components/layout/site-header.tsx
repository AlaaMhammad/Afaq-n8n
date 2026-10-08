"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";
import { SECTION_IDS } from "@/lib/agent/actions";
import type { SectionId } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Container } from "./container";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const NAV_SECTIONS = SECTION_IDS.filter((id) => id !== "order");

function NavLink({ id, label, active, onNavigate }: { id: SectionId; label: string; active: boolean; onNavigate?: () => void }) {
  return (
    <a
      href={`#${id}`}
      onClick={onNavigate}
      aria-current={active ? "location" : undefined}
      className={cn(
        "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "text-foreground" : "text-muted hover:text-foreground",
        "after:absolute after:inset-x-3 after:-bottom-px after:h-px after:origin-center after:scale-x-0 after:bg-accent after:transition-transform",
        active && "after:scale-x-100",
      )}
    >
      {label}
    </a>
  );
}

/** Sticky glass header: section anchors, language + theme switches, primary CTA, mobile drawer. */
export function SiteHeader() {
  const t = useTranslations();
  const activeSection = useUiStore((state) => state.activeSection);
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <Container className="flex h-16 items-center justify-between gap-4">
        <a href="#hero" className="rounded-lg focus-visible:outline-offset-4">
          <Logo label={t("meta.brand")} />
        </a>

        <nav aria-label={t("nav.label")} className="hidden items-center gap-1 md:flex">
          {NAV_SECTIONS.map((id) => (
            <NavLink key={id} id={id} label={t(`nav.${id}`)} active={activeSection === id} />
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button asChild size="sm" className="ms-2 hidden sm:inline-flex">
            <a href="#order">{t("nav.order")}</a>
          </Button>

          <DialogPrimitive.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <DialogPrimitive.Trigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("nav.openMenu")}>
                <Menu />
              </Button>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden" />
              <DialogPrimitive.Content className="fixed inset-y-0 end-0 z-50 flex w-72 flex-col gap-2 border-s border-border bg-surface p-6 md:hidden">
                <DialogPrimitive.Title className="mb-4">
                  <Logo label={t("meta.brand")} />
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">{t("nav.label")}</DialogPrimitive.Description>
                <nav aria-label={t("nav.label")} className="flex flex-col gap-1">
                  {SECTION_IDS.map((id) => (
                    <NavLink key={id} id={id} label={t(`nav.${id}`)} active={activeSection === id} onNavigate={() => setMobileNavOpen(false)} />
                  ))}
                </nav>
                <DialogPrimitive.Close asChild>
                  <Button variant="secondary" className="mt-auto">
                    {t("nav.closeMenu")}
                  </Button>
                </DialogPrimitive.Close>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      </Container>
    </header>
  );
}
