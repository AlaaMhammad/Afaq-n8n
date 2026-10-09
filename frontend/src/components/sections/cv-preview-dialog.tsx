"use client";

import { Download, ExternalLink, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * CV preview modal. Desktop browsers render the PDF natively in an iframe; phones (whose
 * browsers mostly can't show inline PDFs) get open/download actions instead of a blank frame.
 */
export function CvPreviewDialog() {
  const t = useTranslations();
  const preview = useUiStore((s) => s.cvPreview);
  const close = useUiStore((s) => s.closeCvPreview);
  const inlinePdf = useMediaQuery("(min-width: 768px) and (pointer: fine)", true);
  const title = preview ? t("team.cvTitle", { name: preview.name }) : "";

  return (
    <Dialog open={preview !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className={inlinePdf ? "h-[88vh] max-w-4xl" : "max-w-md"} closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{t("team.previewCv")}</DialogDescription>
        </DialogHeader>

        {preview &&
          (inlinePdf ? (
            <iframe src={preview.url} title={title} className="min-h-0 w-full flex-1 rounded-xl border border-border bg-white" />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-6 text-center">
              <FileText className="size-10 text-pulse" aria-hidden />
              <p className="text-sm text-muted">{t("team.mobilePdf")}</p>
            </div>
          ))}

        {preview && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button asChild variant="ghost" size="sm">
              <a href={preview.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> {t("team.openPdf")}
              </a>
            </Button>
            <Button asChild size="sm">
              <a href={preview.downloadUrl} download>
                <Download /> {t("team.downloadCv")}
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
