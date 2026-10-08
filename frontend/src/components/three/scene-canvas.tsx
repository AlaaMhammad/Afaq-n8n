"use client";

import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import type { Vec3 } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useSceneStore } from "@/stores/scene-store";
import { settingsFor } from "./utils/quality";

interface SceneCanvasProps {
  children: ReactNode;
  /** Accessible description of the scene (the canvas itself is announced as an image). */
  label: string;
  camera: { position: Vec3; fov?: number };
  className?: string;
  /** Transparent canvas over the page (hero) instead of an opaque stage. */
  transparent?: boolean;
  /** Feed frame-rate into the shared quality tier (one canvas should own this). */
  monitorPerformance?: boolean;
  onReady?: () => void;
  onPointerMissed?: () => void;
  onDoubleClick?: () => void;
}

/**
 * Resilient R3F canvas wrapper (docs/03_frontend_3d/r3f_components.md §2):
 * - renders nothing while off-screen (`frameloop="never"`), saving battery on phones;
 * - DPR / antialias from the quality tier, adapted at runtime by drei's PerformanceMonitor;
 * - WebGL context loss and render errors fall back to the 2D diagram instead of a blank box.
 */
export function SceneCanvas({
  children,
  label,
  camera,
  className,
  transparent = false,
  monitorPerformance = false,
  onReady,
  onPointerMissed,
  onDoubleClick,
}: SceneCanvasProps) {
  const quality = useSceneStore((s) => s.quality);
  const settings = settingsFor(quality);
  const wrapper = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = wrapper.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scene = useSceneStore.getState;

  return (
    <div ref={wrapper} role="img" aria-label={label} className={cn("absolute inset-0", className)} onDoubleClick={onDoubleClick}>
      <CanvasErrorBoundary onError={() => scene().fallbackTo2d("error")}>
        <Canvas
          frameloop={visible ? "always" : "never"}
          dpr={settings.dpr}
          gl={{
            antialias: settings.antialias,
            alpha: transparent,
            powerPreference: "high-performance",
            stencil: false,
          }}
          camera={{
            position: camera.position,
            fov: camera.fov ?? 40,
            near: 0.1,
            far: 120,
          }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", (event) => {
              event.preventDefault();
              scene().fallbackTo2d("context-lost");
            });
          }}
          onPointerMissed={onPointerMissed}
        >
          {monitorPerformance && (
            <PerformanceMonitor
              flipflops={3}
              onDecline={() => scene().adaptQuality("down")}
              onIncline={() => scene().adaptQuality("up")}
              onFallback={() => scene().fallbackTo2d("performance")}
            />
          )}
          <Suspense fallback={null}>
            {children}
            {onReady && <FirstFrame onReady={onReady} />}
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}

/** Signals the first rendered frame after Suspense resolved, so the DOM poster can fade out. */
function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady();
  });
  return null;
}

class CanvasErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") console.error("[3D] scene failed, falling back to 2D", error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
