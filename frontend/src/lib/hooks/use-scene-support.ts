"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { detectQualityTier, isWebGLAvailable } from "@/components/three/utils/quality";
import { useSceneStore } from "@/stores/scene-store";

const noopSubscribe = () => () => {};

/** `null` during SSR/hydration, then whether WebGL is available (probed once per page). */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(noopSubscribe, isWebGLAvailable, () => null);
}

/**
 * Probes WebGL and records the device's quality tier once (idempotent — every 3D surface may
 * call it). Returns the WebGL probe result.
 */
export function useSceneSupport(): boolean | null {
  const webgl = useWebGLSupport();

  useEffect(() => {
    if (webgl === null) return;
    const scene = useSceneStore.getState();
    if (webgl) scene.detectQuality(detectQualityTier());
    else scene.fallbackTo2d("unsupported");
  }, [webgl]);

  return webgl;
}

/** Becomes true once the browser is idle after hydration — heavy chunks wait for this. */
export function useIdle(timeoutMs = 2000): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(() => setIdle(true), {
        timeout: timeoutMs,
      });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(() => setIdle(true), 600);
    return () => clearTimeout(timer);
  }, [timeoutMs]);

  return idle;
}

/** Latches true once the element comes within `rootMargin` of the viewport. */
export function useNearViewport(ref: React.RefObject<Element | null>, rootMargin = "800px 0px"): boolean {
  const [near, setNear] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const element = ref.current;
    if (near || !element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin, near]);

  return near;
}
