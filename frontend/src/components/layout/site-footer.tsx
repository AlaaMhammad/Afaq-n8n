import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "./container";
import { Logo } from "./logo";

const CONTACT_EMAIL = "hello@afaqn8n.me";

export function SiteFooter({ year }: { year: number }) {
  const t = useTranslations();

  return (
    <footer className="border-t border-border bg-surface/40">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm space-y-2">
          <Logo label={t("meta.brand")} />
          <p className="text-sm text-muted">{t("footer.tagline")}</p>
        </div>
        <div className="space-y-2 text-sm sm:text-end">
          <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 text-pulse hover:underline">
            <Mail className="size-4" aria-hidden />
            <span dir="ltr">{CONTACT_EMAIL}</span>
          </a>
          <p className="text-muted">{t("footer.rights", { year })}</p>
        </div>
      </Container>
    </footer>
  );
}
