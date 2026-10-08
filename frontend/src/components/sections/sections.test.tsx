import { describe, expect, it, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import type { Project, Service } from "@/lib/api/types";
import { useSceneStore } from "@/stores/scene-store";
import { useUiStore } from "@/stores/ui-store";
import { PortfolioExplorer } from "./portfolio-explorer";
import { ServicesSection } from "./services-section";

function withIntl(ui: React.ReactNode, locale: "ar" | "en" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "ar" ? ar : en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const service: Service = {
  id: 1,
  slug: "crm-sync",
  title: "CRM Sync",
  description: "Two-way sync",
  icon: "refresh-cw",
  features: ["Real-time", "De-duplication", "Field mapping", "Retries"],
  starting_price: 2000,
  order: 1,
};

const project = (slug: string, title: string): Project => ({
  id: 1,
  slug,
  title,
  client: "Client",
  summary: `${title} summary`,
  metrics: { avgExecutionMs: 840, failureRate: 0, nodesCount: 2, monthlyRuns: 120000, hoursSavedPerMonth: 310 },
  workflow: {
    version: 1,
    camera: null,
    nodes: [
      { id: "in", kind: "trigger", label: `${title} In`, n8nType: "webhook", position: [-1.5, 0, 0], exploded: [-1, 1, 0] },
      { id: "out", kind: "action", label: `${title} Out`, n8nType: "hubspot", position: [1.5, 0, 0], exploded: [1, -1, 0] },
    ],
    edges: [{ from: "in", to: "out" }],
  },
  services: [],
  live_url: null,
  cover_url: null,
  is_featured: true,
  order: 1,
});

beforeEach(() => {
  useSceneStore.setState({ knownProjects: [], projectTitles: {}, activeProjectSlug: null, mode: "assembled", selectedNodeId: null });
  useUiStore.setState({ bookingPrefill: null, activeSection: "hero" });
});

describe("ServicesSection", () => {
  it("renders services with three feature badges and an isolated LTR price", () => {
    withIntl(<ServicesSection services={[service]} />, "ar");

    const card = screen.getByText("CRM Sync").closest("li")!;
    expect(within(card).getAllByText(/Real-time|De-duplication|Field mapping|Retries/)).toHaveLength(3);
    const price = card.querySelector("bdi")!;
    expect(price).toHaveAttribute("dir", "ltr");
    expect(price.textContent).toContain("2,000");
  });

  it("prefills the booking form from a service card", () => {
    withIntl(<ServicesSection services={[service]} />);

    fireEvent.click(screen.getByRole("button", { name: "Request this service" }));

    expect(useUiStore.getState().bookingPrefill).toEqual({ serviceSlug: "crm-sync" });
    expect(useUiStore.getState().activeSection).toBe("order");
  });

  it("shows an empty state when the API was unavailable", () => {
    withIntl(<ServicesSection services={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(/could not be loaded/i);
  });
});

describe("PortfolioExplorer", () => {
  const projects = [project("omni", "Omni"), project("leads", "Leads")];

  it("registers projects in the scene store and switches via tabs", () => {
    withIntl(<PortfolioExplorer projects={projects} />);

    expect(useSceneStore.getState().knownProjects).toEqual(["omni", "leads"]);
    fireEvent.click(screen.getByRole("tab", { name: "Leads" }));

    expect(useSceneStore.getState().activeProjectSlug).toBe("leads");
    expect(document.querySelector("[data-active-project]")).toHaveAttribute("data-active-project", "leads");
  });

  it("reflects explode state from the store (as the AI agent sets it)", () => {
    withIntl(<PortfolioExplorer projects={projects} />);
    const stage = document.querySelector("[data-active-project]")!;
    expect(stage).toHaveAttribute("data-mode", "assembled");

    fireEvent.click(screen.getByRole("button", { name: "Explode" }));
    expect(stage).toHaveAttribute("data-mode", "exploded");
    expect(useSceneStore.getState().mode).toBe("exploded");
  });

  it("shows node details when a node is selected", () => {
    withIntl(<PortfolioExplorer projects={projects} />);

    fireEvent.click(screen.getByRole("button", { name: /Omni Out/ }));

    expect(screen.getByText("hubspot")).toBeInTheDocument();
  });
});
