"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

/** Theme- and direction-aware toast host (agent actions, booking confirmations). */
export function Toaster({ dir }: { dir: "rtl" | "ltr" }) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      dir={dir}
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position={dir === "rtl" ? "bottom-left" : "bottom-right"}
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border !border-border !bg-surface !text-foreground !shadow-lg",
          description: "!text-muted",
        },
      }}
    />
  );
}
