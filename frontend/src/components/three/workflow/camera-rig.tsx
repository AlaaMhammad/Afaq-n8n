"use client";

import { useEffect, useMemo, useRef, type ComponentRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { PerspectiveCamera, Vector3 } from "three";
import type { Workflow } from "@/lib/api/types";
import { useSceneStore } from "@/stores/scene-store";
import { damp } from "../utils/spring";
import { fitCamera, focusPose, type CameraPose } from "../utils/camera";
import type { WorkflowSim } from "./workflow-sim";

interface CameraRigProps {
  workflow: Workflow;
  sim: WorkflowSim;
  /** Drag-to-orbit on fine pointers; touch devices keep native page scrolling. */
  orbit: boolean;
  reducedMotion: boolean;
}

/**
 * Glides the camera to its goal — the fitted overview, a selected node, or an explicit
 * `cameraGoal` from the store — then hands control back to the visitor. A drag cancels the
 * glide immediately so the camera never fights the hand.
 */
export function CameraRig({ workflow, sim, orbit, reducedMotion }: CameraRigProps) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const gliding = useRef(true);
  const target = useRef(new Vector3());
  const goal = useRef(new Vector3());
  const goalTarget = useRef(new Vector3());

  const fov = camera instanceof PerspectiveCamera ? camera.fov : 40;
  const overview = useMemo(() => fitCamera(workflow, size.width / Math.max(size.height, 1), fov), [workflow, size.width, size.height, fov]);
  const selectedId = useSceneStore((s) => s.selectedNodeId);
  const cameraGoal = useSceneStore((s) => s.cameraGoal);

  // Any change of intent restarts the glide.
  useEffect(() => {
    gliding.current = true;
  }, [overview, selectedId, cameraGoal]);

  useFrame((_, dt) => {
    if (!gliding.current) return;

    let pose: CameraPose = cameraGoal ?? overview;
    const node = selectedId ? sim.node(selectedId) : undefined;
    if (node) pose = focusPose([node.position.x, node.position.y, node.position.z], overview);

    goal.current.set(...pose.position);
    goalTarget.current.set(...pose.target);
    const current = controls.current?.target ?? target.current;

    if (reducedMotion) {
      camera.position.copy(goal.current);
      current.copy(goalTarget.current);
    } else {
      const lambda = 3.4;
      camera.position.set(
        damp(camera.position.x, goal.current.x, lambda, dt),
        damp(camera.position.y, goal.current.y, lambda, dt),
        damp(camera.position.z, goal.current.z, lambda, dt),
      );
      current.set(
        damp(current.x, goalTarget.current.x, lambda, dt),
        damp(current.y, goalTarget.current.y, lambda, dt),
        damp(current.z, goalTarget.current.z, lambda, dt),
      );
    }

    if (controls.current) controls.current.update();
    else camera.lookAt(current);

    // A selected node keeps floating, so keep tracking it; otherwise stop once we've arrived.
    if (!node && camera.position.distanceToSquared(goal.current) < 1e-4 && current.distanceToSquared(goalTarget.current) < 1e-4) {
      gliding.current = false;
    }
  });

  if (!orbit) return null;

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableZoom={false}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      minPolarAngle={0.75}
      maxPolarAngle={1.75}
      minAzimuthAngle={-0.75}
      maxAzimuthAngle={0.75}
      onStart={() => {
        gliding.current = false;
      }}
    />
  );
}
