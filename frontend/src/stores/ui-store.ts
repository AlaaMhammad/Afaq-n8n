import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { BudgetRange, SectionId, Timeline } from "@/lib/api/types";

/**
 * Page-level UI state. Theme lives in next-themes (class on <html>, persisted, no flash)
 * and locale in the URL segment — neither is duplicated here.
 * Spec: docs/01_architecture/state_management.md §3
 */

export interface BookingDraft {
  serviceSlug?: string;
  budgetRange?: BudgetRange;
  timeline?: Timeline;
  requirements?: string;
}

export interface UiState {
  activeSection: SectionId;
  mobileNavOpen: boolean;
  cvPreview: { memberId: number; name: string; url: string } | null;
  bookingPrefill: BookingDraft | null;

  setActiveSection: (section: SectionId) => void;
  setMobileNavOpen: (open: boolean) => void;
  openCvPreview: (preview: { memberId: number; name: string; url: string }) => void;
  closeCvPreview: () => void;
  prefillBooking: (draft: BookingDraft | null) => void;
}

export const useUiStore = create<UiState>()(
  devtools(
    (set) => ({
      activeSection: "hero",
      mobileNavOpen: false,
      cvPreview: null,
      bookingPrefill: null,

      setActiveSection: (activeSection) => set({ activeSection }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      openCvPreview: (cvPreview) => set({ cvPreview }),
      closeCvPreview: () => set({ cvPreview: null }),
      prefillBooking: (bookingPrefill) => set({ bookingPrefill }),
    }),
    { name: "ui", enabled: process.env.NODE_ENV === "development" },
  ),
);
