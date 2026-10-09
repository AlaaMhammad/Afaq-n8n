import { describe, expect, it } from "vitest";
import { BOOKING_DEFAULTS, bookingSchema, firstStepWithError, readUtm, toServiceRequest, type BookingValues } from "./schema";

const valid: BookingValues = {
  ...(BOOKING_DEFAULTS as BookingValues),
  service_slug: "crm-sync",
  requirements: "Sync HubSpot deals with our ERP every hour.",
  budget_range: "5k_15k",
  client_name: "Huda Al-Zahrani",
  client_email: "huda@waha.example",
  consent: true,
};

describe("booking schema", () => {
  it("mirrors the API rules with i18n message keys", () => {
    expect(bookingSchema.safeParse(valid).success).toBe(true);

    const result = bookingSchema.safeParse({ ...valid, requirements: "short", client_email: "nope", client_phone: "12", consent: false, budget_range: undefined });
    expect(result.success).toBe(false);
    const issues = Object.fromEntries(result.error!.issues.map((issue) => [issue.path[0], issue.message]));
    expect(issues).toMatchObject({
      requirements: "requirementsMin",
      client_email: "emailInvalid",
      client_phone: "phoneInvalid",
      consent: "consentRequired",
      budget_range: "budgetRequired",
    });
  });

  it("accepts Arabic-Indic phone digits and an empty optional phone", () => {
    expect(bookingSchema.safeParse({ ...valid, client_phone: "٠٥٥١٢٣٤٥٦٧" }).success).toBe(true);
    expect(bookingSchema.safeParse({ ...valid, client_phone: "" }).success).toBe(true);
  });

  it("maps API field errors back to the first step that owns them", () => {
    expect(firstStepWithError(["client_email", "requirements"])).toBe(1);
    expect(firstStepWithError(["client_phone"])).toBe(3);
    expect(firstStepWithError(["unknown"])).toBe(4);
  });

  it("builds the API payload without blank optionals and with UTM tags", () => {
    const payload = toServiceRequest({ ...valid, service_slug: "", company: "" }, "ar", readUtm("?utm_source=linkedin&utm_medium=post&x=1"));
    expect(payload).toMatchObject({ locale: "ar", consent: true, utm: { source: "linkedin", medium: "post" } });
    expect(payload).not.toHaveProperty("service_slug", "");
    expect(payload.service_slug).toBeUndefined();
    expect(payload.company).toBeUndefined();
    expect(payload.website).toBeUndefined();
  });
});
