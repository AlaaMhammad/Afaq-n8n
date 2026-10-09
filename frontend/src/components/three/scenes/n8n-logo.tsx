"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import { AdditiveBlending, CatmullRomCurve3, Color, ExtrudeGeometry, NormalBlending, Object3D, Vector3, type Group, type InstancedMesh, type Mesh, type MeshBasicMaterial } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { StageSceneProps } from "@/components/stage/stage-slot";
import { useReducedMotion } from "@/lib/hooks/use-media-query";
import { N8N_CORAL, N8N_LOGO } from "@/lib/integrations";
import { scenePalette, type ScenePalette } from "@/lib/theme/palette";
import { useSceneStore } from "@/stores/scene-store";
import { Halo } from "../hardware/parts";
import { StageView, useSectionProgress } from "../stage/stage-view";
import { getGlowTexture } from "../utils/textures";
import { stepSpring } from "../utils/spring";

/** The logo is authored on a 24×24 grid; scene units per grid unit. */
const SCALE = 0.2;
const DEPTH = 2.4;
/** Ring centres of the n8n mark (grid units): trigger, hub, and the two branch outputs. */
const RINGS = { trigger: [2.5263, 12], hub: [8.8421, 12], top: [21.4737, 8.2105], bottom: [18.9474, 15.7895] } as const;
const RING_INNER = 1.2632;
const PULSES = 6;

const toScene = ([x, y]: readonly [number, number], z = 0) => new Vector3((x - 12) * SCALE, -(y - 12) * SCALE, z);

/** Extruded, bevelled n8n mark from its official SVG path, centred on the origin. */
function buildLogoGeometry(): ExtrudeGeometry {
  const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${N8N_LOGO.kind === "brand" ? N8N_LOGO.path : ""}"/></svg>`);
  const shapes = svg.paths.flatMap((path) => SVGLoader.createShapes(path));
  const geometry = new ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.22, bevelSegments: 3, curveSegments: 24 });
  geometry.translate(-12, -12, -DEPTH / 2);
  geometry.scale(SCALE, -SCALE, SCALE); // SVG Y points down
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Hero: the n8n logo in 3D. It assembles on load (extrudes out of the page and swings into place),
 * floats and leans toward the pointer, and — once the visitor scrolls or clicks it — "executes":
 * data pulses run from the trigger ring through the hub to both branch outputs, lighting each ring
 * as they arrive, and the page's data conduits energise.
 */
export default function N8nLogo({ theme, onReady }: StageSceneProps) {
  const palette = scenePalette(theme);
  return (
    <StageView index={2} palette={palette} camera={{ position: [0, 0.4, 8.2], fov: 34, target: [0, 0, 0] }} onReady={onReady}>
      <Logo palette={palette} />
    </StageView>
  );
}

function Logo({ palette }: { palette: ScenePalette }) {
  const powered = useSceneStore((s) => s.powered);
  const reducedMotion = useReducedMotion();
  const progress = useSectionProgress("hero");
  const geometry = useMemo(() => buildLogoGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const rig = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const lamps = useRef<(Mesh | null)[]>([]);
  const pulses = useRef<InstancedMesh>(null);
  const assemble = useRef({ x: 0, v: 0 });
  const pointer = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const frontZ = (DEPTH / 2) * SCALE + 0.08;
  // Execution routes: trigger → hub → top branch, and trigger → hub → bottom branch (via the fork).
  const routes = useMemo(() => {
    const t = toScene(RINGS.trigger, frontZ);
    const h = toScene(RINGS.hub, frontZ);
    const fork = toScene([13.96, 12], frontZ);
    return [
      new CatmullRomCurve3([t, h, fork, toScene([15.6, 8.4], frontZ), toScene(RINGS.top, frontZ)]),
      new CatmullRomCurve3([t, h, fork, toScene([15.6, 15.6], frontZ), toScene(RINGS.bottom, frontZ)]),
    ];
  }, [frontZ]);
  const ringOrder = ["trigger", "hub", "top", "bottom"] as const;
  const glow = useMemo(() => new Color(N8N_CORAL).multiplyScalar(palette.glow * 1.3), [palette.glow]);
  const halo = useMemo(() => getGlowTexture(), []);
  const dummy = useRef(new Object3D());
  const pulseColor = useMemo(() => new Color("#ffffff").multiplyScalar(palette.glow), [palette.glow]);

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  useFrame(({ clock }, dt) => {
    const time = clock.elapsedTime;
    // Assembly: extrude out of the page and swing into place, with a small mechanical overshoot.
    if (reducedMotion) assemble.current.x = 1;
    else stepSpring(assemble.current, 1, dt, { stiffness: 38, dampingRatio: 0.55 });
    const a = assemble.current.x;
    if (body.current) body.current.scale.set(1, 1, Math.max(0.02, a));

    if (rig.current) {
      const float = reducedMotion ? 0 : Math.sin(time * 0.9) * 0.08;
      rig.current.position.y = float;
      const sway = reducedMotion ? 0 : Math.sin(time * 0.35) * 0.08;
      const targetY = (1 - Math.min(a, 1)) * -0.9 + pointer.current.x * 0.35 + sway;
      const targetX = pointer.current.y * 0.18 + (progress.current - 0.5) * 0.5;
      rig.current.rotation.y += (targetY - rig.current.rotation.y) * Math.min(1, dt * 3);
      rig.current.rotation.x += (targetX - rig.current.rotation.x) * Math.min(1, dt * 3);
    }

    // Execution: pulses ride the routes; each ring lamp lights as the pulse front reaches it.
    const cycle = powered ? (reducedMotion ? 1 : (time * 0.45) % 1.4) : -1;
    const arrivals = { trigger: 0, hub: 0.32, top: 1, bottom: 1 };
    ringOrder.forEach((name, i) => {
      const lamp = lamps.current[i];
      if (!lamp) return;
      const since = cycle - arrivals[name];
      const intensity = powered ? (since >= 0 ? Math.max(0.35, 1 - since * 1.4) : 0.35) : 0.12;
      (lamp.material as MeshBasicMaterial).opacity = intensity;
      lamp.scale.setScalar(1 + (since >= 0 && since < 0.3 ? (0.3 - since) : 0));
    });

    const mesh = pulses.current;
    if (!mesh) return;
    for (let i = 0; i < PULSES; i++) {
      const route = routes[i % 2];
      const u = powered ? (reducedMotion ? (i + 0.5) / PULSES : (time * 0.45 + i / PULSES) % 1) : 0;
      const d = dummy.current;
      route.getPointAt(u, d.position);
      d.scale.setScalar(powered ? 1 : 0);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const toggle = () => useSceneStore.getState().setPowered(!useSceneStore.getState().powered);

  return (
    <group
      ref={rig}
      onClick={(event) => {
        event.stopPropagation();
        toggle();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <sprite scale={9} position={[0, 0, -1]}>
        <spriteMaterial map={halo} color={N8N_CORAL} transparent opacity={palette.additive ? 0.32 : 0.18} blending={palette.additive ? AdditiveBlending : NormalBlending} depthWrite={false} />
      </sprite>

      <mesh ref={body} geometry={geometry}>
        <meshPhysicalMaterial color={N8N_CORAL} metalness={0.35} roughness={0.22} clearcoat={1} clearcoatRoughness={0.12} emissive={N8N_CORAL} emissiveIntensity={palette.theme === "dark" ? 0.22 : 0.08} />
      </mesh>

      {/* ring lamps: the holes in each ring light up as execution passes through */}
      {ringOrder.map((name, i) => {
        const p = toScene(RINGS[name], 0);
        return (
          <mesh
            key={name}
            ref={(element) => {
              lamps.current[i] = element;
            }}
            position={p}
            rotation-x={Math.PI / 2}
          >
            <cylinderGeometry args={[RING_INNER * SCALE * 0.95, RING_INNER * SCALE * 0.95, DEPTH * SCALE * 0.9, 32]} />
            <meshBasicMaterial color={glow} transparent opacity={0.12} toneMapped={false} />
          </mesh>
        );
      })}

      <instancedMesh ref={pulses} args={[undefined, undefined, PULSES]} frustumCulled={false}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color={pulseColor} toneMapped={false} transparent blending={palette.additive ? AdditiveBlending : NormalBlending} depthWrite={false} />
      </instancedMesh>

      <Halo color={N8N_CORAL} palette={palette} size={6} y={-1.7} intensity={0.3} />
    </group>
  );
}
