import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import { ApiError } from "@/lib/api/client";
import type { Service } from "@/lib/api/types";
import { useUiStore } from "@/stores/ui-store";

const fetchEstimate = vi.fn();
const submitServiceRequest = vi.fn();
vi.mock("@/lib/api/booking", () => ({
  fetchEstimate: (...args: unknown[]) => fetchEstimate(...args),
  submitServiceRequest: (...args: unknown[]) => submitServiceRequest(...args),
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn() }) }));

const { BookingForm, DRAFT_KEY } = await import("./booking-form");

const services: Service[] = [
  { id: 1, slug: "crm-sync", title: "CRM Sync", description: "", icon: "refresh-cw", features: [], starting_price: 2000, order: 1 },
  { id: 2, slug: "voice", title: "Voice Agents", description: "", icon: "bot", features: [], starting_price: 3000, order: 2 },
];

const renderForm = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <BookingForm services={services} />
    </NextIntlClientProvider>,
  );

const continueButton = () => screen.getByRole("button", { name: /Continue/ });

async function fillToReview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: /CRM Sync/ }));
  await user.click(continueButton());
  await user.type(screen.getByLabelText("What should the automation do?"), "Sync HubSpot deals into our ERP every hour.");
  await user.click(continueButton());
  await user.click(screen.getByRole("radio", { name: "$5k – $15k" }));
  await user.click(continueButton());
  await user.type(screen.getByLabelText("Full name"), "Huda Al-Zahrani");
  await user.type(screen.getByLabelText("Work email"), "huda@waha.example");
  await user.click(continueButton());
}

beforeEach(() => {
  sessionStorage.clear();
  fetchEstimate.mockReset().mockResolvedValue({ min: 3850, max: 5850, currency: "USD", weeks: [3, 5], exceeds_budget: false });
  submitServiceRequest.mockReset();
  useUiStore.setState({ bookingPrefill: null });
});

describe("BookingForm", () => {
  it("validates each step before moving on", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(continueButton()); // step 1: "not sure" is a valid choice
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();

    await user.type(screen.getByLabelText("What should the automation do?"), "too short");
    await user.click(continueButton());
    expect(await screen.findByText("Please describe your needs in at least 20 characters.")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
  });

  it("walks all five steps with a live estimate and submits the lead", async () => {
    const user = userEvent.setup();
    submitServiceRequest.mockResolvedValue({ reference: "AFQ-7K2M9P", status: "new", estimate: { min: 3850, max: 5850, currency: "USD", weeks: [3, 5] } });
    renderForm();

    await fillToReview(user);

    // Live estimate followed the choices (debounced)
    await waitFor(() => expect(fetchEstimate).toHaveBeenLastCalledWith(expect.objectContaining({ service_slug: "crm-sync", budget_range: "5k_15k", complexity: 3 }), expect.anything()));
    expect(screen.getAllByTestId("estimate")[0]).toHaveTextContent("$3,850 – $5,850");

    // Review shows the summary; consent is required
    expect(screen.getByText("Review and send")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Send request/ }));
    expect(await screen.findByText("Please accept to continue.")).toBeInTheDocument();
    expect(submitServiceRequest).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Send request/ }));

    expect(await screen.findByTestId("booking-reference")).toHaveTextContent("AFQ-7K2M9P");
    expect(submitServiceRequest).toHaveBeenCalledWith(
      expect.objectContaining({ service_slug: "crm-sync", budget_range: "5k_15k", client_email: "huda@waha.example", consent: true, locale: "en" }),
    );
    expect(submitServiceRequest.mock.calls[0][0]).not.toHaveProperty("website", expect.any(String));
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("maps a 422 back onto the field and jumps to its step", async () => {
    const user = userEvent.setup();
    submitServiceRequest.mockRejectedValue(
      new ApiError({ type: "x", title: "Invalid", status: 422, code: "VALIDATION_FAILED", errors: { client_email: ["The email domain does not accept mail."] } }),
    );
    renderForm();
    await fillToReview(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Send request/ }));

    expect(await screen.findByText("The email domain does not accept mail.")).toBeInTheDocument();
    expect(screen.getByText("Step 4 of 5")).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toHaveAttribute("aria-invalid", "true");
  });

  it("explains a duplicate submission with the existing reference", async () => {
    const user = userEvent.setup();
    submitServiceRequest.mockRejectedValue(new ApiError({ type: "x", title: "Conflict", status: 409, code: "CONFLICT", reference: "AFQ-ABC123" }));
    renderForm();
    await fillToReview(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Send request/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("AFQ-ABC123");
  });

  it("jumps to the scope step when a service card prefills it", async () => {
    renderForm();
    act(() => useUiStore.getState().prefillBooking({ serviceSlug: "voice" }));

    expect(await screen.findByText("Step 2 of 5")).toBeInTheDocument();
    expect(useUiStore.getState().bookingPrefill).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByRole("radio", { name: /Voice Agents/ })).toBeChecked();
  });

  it("restores an unsent draft from this tab's session", async () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step: 2, values: { service_slug: "crm-sync", requirements: "Restore me please — twenty+ characters." } }));
    renderForm();

    expect(await screen.findByText("We restored your unsent answers.")).toBeInTheDocument();
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument();
    const summary = screen.getByRole("complementary");
    expect(within(summary).getByText("CRM Sync")).toBeInTheDocument();
  });
});
