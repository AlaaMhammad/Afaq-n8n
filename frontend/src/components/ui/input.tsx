import * as React from "react";
import { cn } from "@/lib/utils";

const fieldClasses =
  "w-full rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground placeholder:text-muted/70 transition-colors outline-none focus-visible:border-pulse focus-visible:ring-2 focus-visible:ring-pulse/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-danger/20";

/** `dir="auto"` lets Arabic and English input align naturally in either page direction. */
export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" type={type} dir="auto" className={cn(fieldClasses, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" dir="auto" className={cn(fieldClasses, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
}
