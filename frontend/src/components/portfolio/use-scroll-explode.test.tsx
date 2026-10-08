import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { useSceneStore } from "@/stores/scene-store";
import { useScrollExplode } from "./use-scroll-explode";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let trigger: Callback = () => {};

class FakeIntersectionObserver {
  constructor(callback: Callback) {
    trigger = callback;
  }
  observe() {}
  disconnect() {}
}

function Stage() {
  const ref = useRef<HTMLDivElement>(null);
  useScrollExplode(ref);
  return <div ref={ref} />;
}

const initial = useSceneStore.getState();
const view = (ratio: number) => act(() => trigger([{ intersectionRatio: ratio, isIntersecting: ratio > 0 }]));

beforeEach(() => {
  useSceneStore.setState(initial, true);
  useSceneStore.getState().registerProjects([
    { slug: "a", title: "A" },
    { slug: "b", title: "B" },
  ]);
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.useFakeTimers();
});

afterEach(() => vi.unstubAllGlobals());

describe("useScrollExplode", () => {
  it("explodes after a beat once mostly in view and reassembles when scrolled away", () => {
    render(<Stage />);

    view(0.3);
    vi.advanceTimersByTime(2000);
    expect(useSceneStore.getState().mode).toBe("assembled");

    view(0.7);
    vi.advanceTimersByTime(300);
    expect(useSceneStore.getState().mode).toBe("assembled"); // the assembled state is seen first
    vi.advanceTimersByTime(400);
    expect(useSceneStore.getState().mode).toBe("exploded");

    view(0);
    expect(useSceneStore.getState().mode).toBe("assembled");
  });

  it("replays the reveal when switching projects while in view", () => {
    render(<Stage />);
    view(0.8);
    vi.advanceTimersByTime(700);

    act(() => {
      useSceneStore.getState().setActiveProject("b");
    });
    expect(useSceneStore.getState().mode).toBe("assembled");
    vi.advanceTimersByTime(700);
    expect(useSceneStore.getState().mode).toBe("exploded");
  });

  it("stops for the visit once the visitor or the agent chose a mode", () => {
    render(<Stage />);
    view(0.8);
    act(() => useSceneStore.getState().setMode("assembled", "agent")); // e.g. agent asked to keep it assembled
    vi.advanceTimersByTime(2000);
    expect(useSceneStore.getState().mode).toBe("assembled");

    view(0);
    view(0.9);
    vi.advanceTimersByTime(2000);
    expect(useSceneStore.getState().mode).toBe("assembled");
  });
});
