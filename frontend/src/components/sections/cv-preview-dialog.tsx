"use client";

import { useTranslations } from "next-intl";
import { useUiStore } from "@/stores/ui-store";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** In-page PDF preview (browsers render PDFs natively in an iframe). */
export function CvPreviewDialog() {
  const t = useTranslations();
  const preview = useUiStore((s) => s.cvPreview);
  const close = useUiStore((s) => s.closeCvPreview);

  return (
    <Dialog open={preview !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="h-[85vh] max-w-3xl" closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{preview ? t("team.cvTitle", { name: preview.name }) : ""}</DialogTitle>
          <DialogDescription className="sr-only">{t("team.previewCv")}</DialogDescription>
        </DialogHeader>
        {preview && <iframe src={preview.url} title={t("team.cvTitle", { name: preview.name })} className="size-full flex-1 rounded-xl border border-border bg-white" />}
      </DialogContent>
    </Dialog>
  );
}
