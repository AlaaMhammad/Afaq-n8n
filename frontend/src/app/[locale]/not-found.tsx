import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("errors");

  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center gap-4 py-24">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="text-3xl font-bold">{t("notFoundTitle")}</h1>
      <p className="text-muted">{t("notFoundBody")}</p>
      <Button asChild variant="secondary">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </Container>
  );
}
