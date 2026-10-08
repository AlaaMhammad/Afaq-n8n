import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentStore } from "@/stores/agent-store";
import { useSceneStore } from "@/stores/scene-store";
import { useUiStore } from "@/stores/ui-store";
import { parseAgentAction, type AgentAction } from "./actions";
import { CAMERA_SETTLE_MS, drainAgentActions, runAgentAction } from "./run-action";

beforeEach(() => {
  document.body.innerHTML = '<section id="portfolio"></section><section id="team"></section>';
  useSceneStore.setState({ knownProjects: [], projectTitles: {}, activeProjectSlug: null, mode: "assembled" });
  useSceneStore.getState().registerProjects([{ slug: "omnichannel-support-sync", title: "Omni" }, { slug: "lead-enrichment-engine", title: "Leads" }]);
  useAgentStore.setState({ pendingActions: [] });
});

const trigger = (projectSlug: string, mode: "exploded" | "assembled" = "exploded"): AgentAction => ({
  id: "t1", type: "trigger_3d_workflow", payload: { projectSlug, mode },
});

describe("runAgentAction", () => {
  it("navigates by scrolling to the section and updating the active section", async () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    const notify = vi.fn();

    await runAgentAction({ id: "n1", type: "navigate_to", payload: { sectionId: "team" } }, { notify });

    expect(scroll).toHaveBeenCalled();
    expect(useUiStore.getState().activeSection).toBe("team");
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ type: "navigate_to" }), "ok");
  });

  it("switches project first, then explodes after the camera settles", async () => {
    vi.useFakeTimers();
    const notify = vi.fn();

    const done = runAgentAction(trigger("lead-enrichment-engine"), { notify });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000); // scroll settles (timeout fallback)
    expect(useSceneStore.getState()).toMatchObject({ activeProjectSlug: "lead-enrichment-engine", mode: "assembled" });

    await vi.advanceTimersByTimeAsync(CAMERA_SETTLE_MS);
    await done;
    expect(useSceneStore.getState().mode).toBe("exploded");
    expect(notify).toHaveBeenCalledWith(expect.anything(), "ok");
  });

  it("refuses projects the page does not know", async () => {
    const notify = vi.fn();
    await runAgentAction(trigger("ghost-project"), { notify });

    expect(useSceneStore.getState().activeProjectSlug).toBe("omnichannel-support-sync");
    expect(notify).toHaveBeenCalledWith(expect.anything(), "skipped");
  });

  it("drains the queue strictly in order", async () => {
    const seen: string[] = [];
    useAgentStore.setState({
      pendingActions: [
        { id: "1", type: "navigate_to", payload: { sectionId: "team" } },
        { id: "2", type: "service_inquiry_submitted", payload: { reference: "AFQ-ABC123", serviceType: "crm-sync" } },
      ],
    });
    vi.useFakeTimers();

    const drained = drainAgentActions({ notify: (action) => seen.push(action.id) });
    await vi.advanceTimersByTimeAsync(5000);
    await drained;

    expect(seen).toEqual(["1", "2"]);
    expect(useAgentStore.getState().pendingActions).toEqual([]);
  });
});

describe("parseAgentAction", () => {
  it("accepts the three known actions and rejects anything else", () => {
    expect(parseAgentAction({ id: "x", type: "navigate_to", payload: { sectionId: "order" } })).not.toBeNull();
    expect(parseAgentAction({ id: "x", type: "navigate_to", payload: { sectionId: "admin" } })).toBeNull();
    expect(parseAgentAction({ id: "x", type: "trigger_3d_workflow", payload: { projectSlug: "<script>", mode: "exploded" } })).toBeNull();
    expect(parseAgentAction({ id: "x", type: "service_inquiry_submitted", payload: { reference: "AFQ-ABC123", serviceType: "crm" } })).not.toBeNull();
    expect(parseAgentAction({ id: "x", type: "eval", payload: {} })).toBeNull();
  });
});
