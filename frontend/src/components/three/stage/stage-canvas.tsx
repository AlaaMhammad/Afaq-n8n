"use client";

import { Component, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor, View } from "@react-three/drei";
import { useSceneStore } from "@/stores/scene-store";
import { settingsFor } from "../utils/quality";
import { ConduitScene } from "./conduit-scene";

/**
 * The page's single, persistent WebGL canvas: fixed behind the content, transparent, never
 * intercepting the pointer. Every 3D vignette on the page is a drei <View> — a scissored viewport
 * that tracks a DOM placeholder — tunnelled into this one canvas, so there is one GL context, one
 * render loop and one frame-rate monitor for the whole site. Off-screen views are skipped.
 */
export default function StageCanvas({ theme }: { theme: string | undefined }) {
  const quality = useSceneStore((s) => s.quality);
  const settings = settingsFor(quality);
  const scene = useSceneStore.getState;

  return (
    <StageErrorBoundary onError={() => scene().fallbackTo2d("error")}>
      <Canvas
        // Events are read from the whole page; each View maps them into its own rect.
        eventSource={document.body}
        eventPrefix="client"
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: -1 }}
        dpr={settings.dpr}
        gl={{ antialias: settings.antialias, alpha: true, powerPreference: "high-performance", stencil: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.domElement.setAttribute("aria-hidden", "true");
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            scene().setStage("off");
            scene().fallbackTo2d("context-lost");
          });
        }}
      >
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => scene().adaptQuality("down")}
          onIncline={() => scene().adaptQuality("up")}
          onFallback={() => scene().fallbackTo2d("performance")}
        />
        <View.Port />
        <Live />
      </Canvas>
      {/* Full-viewport view behind everything: the data conduits that run down the page. */}
      <View className="pointer-events-none fixed inset-0 -z-10" index={1}>
        <ConduitScene theme={theme} />
      </View>
    </StageErrorBoundary>
  );
}

/** Marks the stage live after the first rendered frame. */
function Live() {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    useSceneStore.getState().setStage("live");
  });
  return null;
}

class StageErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") console.error("[3D] stage failed, falling back to 2D", error);
    useSceneStore.getState().setStage("off");
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
