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

export interface CvPreview {
  memberId: number;
  name: string;
  url: string;
  downloadUrl: string;
}

export interface UiState {
  activeSection: SectionId;
  mobileNavOpen: boolean;
  cvPreview: CvPreview | null;
  bookingPrefill: BookingDraft | null;
  /** What the visitor is pointing at, mirrored by the 3D scenes (rack blade, profile chip). */
  focus: { service: string | null; member: number | null };
  /** Booking progress mirrored by the 3D terminal. */
  bookingTrack: BookingTrack;

  setActiveSection: (section: SectionId) => void;
  setMobileNavOpen: (open: boolean) => void;
  openCvPreview: (preview: CvPreview) => void;
  closeCvPreview: () => void;
  prefillBooking: (draft: BookingDraft | null) => void;
  setFocus: (focus: Partial<UiState["focus"]>) => void;
  setBookingTrack: (track: Partial<BookingTrack>) => void;
}

export interface BookingTrack {
  step: number;
  serviceSlug: string;
  submitted: boolean;
}

export const useUiStore = create<UiState>()(
  devtools(
    (set) => ({
      activeSection: "hero",
      mobileNavOpen: false,
      cvPreview: null,
      bookingPrefill: null,
      focus: { service: null, member: null },
      bookingTrack: { step: 0, serviceSlug: "", submitted: false },

      setActiveSection: (activeSection) => set({ activeSection }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      openCvPreview: (cvPreview) => set({ cvPreview }),
      closeCvPreview: () => set({ cvPreview: null }),
      prefillBooking: (bookingPrefill) => set({ bookingPrefill }),
      setFocus: (focus) => set((state) => ({ focus: { ...state.focus, ...focus } })),
      setBookingTrack: (track) =>
        set((state) => {
          const next = { ...state.bookingTrack, ...track };
          const same = next.step === state.bookingTrack.step && next.serviceSlug === state.bookingTrack.serviceSlug && next.submitted === state.bookingTrack.submitted;
          return same ? state : { bookingTrack: next };
        }),
    }),
    { name: "ui", enabled: process.env.NODE_ENV === "development" },
  ),
);
