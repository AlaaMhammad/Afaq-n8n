"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

/** Dark ⇄ light. Icons switch via CSS (`dark:`), so there is no hydration flash. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("theme");

  return (
    <Tooltip content={t("toggle")}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("toggle")}
        onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      >
        <Sun className="hidden dark:block" />
        <Moon className="dark:hidden" />
      </Button>
    </Tooltip>
  );
}
