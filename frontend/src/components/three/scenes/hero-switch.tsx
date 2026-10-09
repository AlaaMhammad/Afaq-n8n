"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import { BufferAttribute, BufferGeometry, Color, LineBasicMaterial, Line as ThreeLine, type Group, type Mesh } from "three";
import type { StageSceneProps } from "@/components/stage/stage-slot";
import { useReducedMotion } from "@/lib/hooks/use-media-query";
import { scenePalette } from "@/lib/theme/palette";
import { useSceneStore } from "@/stores/scene-store";
import { AcrylicCover, Chassis, Halo, Led, useGlowColor } from "../hardware/parts";
import { panelTexture } from "../hardware/textures";
import { StageView, useSectionProgress } from "../stage/stage-view";
import { settingsFor } from "../utils/quality";
import { stepSpring } from "../utils/spring";

const OPEN_ANGLE = 1.15;
const ARC_POINTS = 9;
const BASE = { width: 2.8, height: 0.42, depth: 1.7 };

/**
 * Hero: an n8n trigger built as a high-voltage knife switch. Scrolling (or a click) throws the
 * copper blade into its jaws — arcs crackle, the status LED turns green and the page's data
 * conduits energise all the way down. Mirrored in Arabic so the circuit reads right → left.
 */
export default function HeroSwitch({ theme, locale, onReady }: StageSceneProps) {
  const palette = scenePalette(theme);
  return (
    <StageView index={2} palette={palette} camera={{ position: [0, 2.7, 6.3], fov: 32, target: [0, 0.25, 0] }} onReady={onReady}>
      <Switch palette={palette} flow={locale === "ar" ? -1 : 1} />
    </StageView>
  );
}

function Switch({ palette, flow }: { palette: ReturnType<typeof scenePalette>; flow: 1 | -1 }) {
  const powered = useSceneStore((s) => s.powered);
  const transmission = useSceneStore((s) => settingsFor(s.quality).transmission);
  const reducedMotion = useReducedMotion();
  const progress = useSectionProgress("hero");
  const rig = useRef<Group>(null);
  const blade = useRef<Group>(null);
  const cover = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const spring = useRef({ x: OPEN_ANGLE, v: 0 });
  const flash = useRef(0);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const copperGlow = useGlowColor("#ffb36b", palette, 0.9);
  const arcColor = useGlowColor(palette.pulse, palette, 1.4);
  const plate = useMemo(() => panelTexture("n8n TRIGGER", "480V · WEBHOOK · CRON", palette.accent, flow === -1 ? "rtl" : "ltr"), [palette.accent, flow]);
  const arc = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(ARC_POINTS * 3), 3));
    return new ThreeLine(geometry, new LineBasicMaterial({ color: new Color(arcColor), transparent: true, toneMapped: false }));
  }, [arcColor]);
  useEffect(() => () => arc.geometry.dispose(), [arc]);
  // Mutated every frame through the ref (never the memoised value) — React Compiler friendly.
  const arcLine = useRef<ThreeLine>(null);

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

  const hingeX = -flow * 0.85;
  const jawX = flow * 0.85;

  useFrame(({ clock }, dt) => {
    const target = powered ? 0 : OPEN_ANGLE;
    const before = spring.current.x;
    if (reducedMotion) spring.current.x = target;
    else stepSpring(spring.current, target, dt, { stiffness: 90, dampingRatio: 0.45 });
    const angle = Math.max(-0.04, spring.current.x);
    if (before > 0.05 && angle <= 0.05) flash.current = 1; // the blade just hit the jaws
    flash.current = Math.max(0, flash.current - dt * 2.2);

    if (blade.current) blade.current.rotation.z = flow * angle;
    if (cover.current) cover.current.position.y = BASE.height / 2 + 0.62 + 0.18 * Math.min(1, angle / OPEN_ANGLE);

    if (rig.current) {
      const p = progress.current;
      rig.current.rotation.y += (pointer.current.x * 0.25 - 0.18 * flow - rig.current.rotation.y) * Math.min(1, dt * 2.5);
      rig.current.rotation.x += (pointer.current.y * 0.08 + (p - 0.5) * 0.35 - rig.current.rotation.x) * Math.min(1, dt * 2.5);
    }
    if (ring.current) {
      const pulse = powered && !reducedMotion ? (clock.elapsedTime * 0.8) % 1 : 0;
      ring.current.scale.setScalar(1 + pulse * 1.6);
      (ring.current.material as { opacity: number }).opacity = powered ? (1 - pulse) * 0.7 : 0;
    }

    // High-voltage arc between the blade tip and the jaw while closing, plus a flash on contact.
    const arcing = (angle > 0.02 && angle < 0.4) || flash.current > 0;
    const line = arcLine.current;
    if (!line) return;
    line.visible = arcing && !reducedMotion;
    if (line.visible) {
      const positions = line.geometry.attributes.position as BufferAttribute;
      const tipX = hingeX + flow * Math.cos(angle) * 1.7;
      const tipY = BASE.height / 2 + 0.34 + Math.sin(angle) * 1.7;
      for (let i = 0; i < ARC_POINTS; i++) {
        const t = i / (ARC_POINTS - 1);
        const jitter = i === 0 || i === ARC_POINTS - 1 ? 0 : (Math.random() - 0.5) * 0.18;
        positions.setXYZ(i, tipX + (jawX - tipX) * t + jitter, tipY + (BASE.height / 2 + 0.3 - tipY) * t + jitter, (Math.random() - 0.5) * 0.08);
      }
      positions.needsUpdate = true;
      (line.material as LineBasicMaterial).opacity = 0.6 + Math.random() * 0.4;
    }
  });

  const onToggle = () => useSceneStore.getState().setPowered(!useSceneStore.getState().powered);

  return (
    <group
      ref={rig}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <Chassis width={BASE.width} height={BASE.height} depth={BASE.depth} palette={palette} accent={palette.accent} hot={powered} />
      {/* screen-printed front plate */}
      {plate && (
        <mesh position={[0, 0, BASE.depth / 2 + 0.006]}>
          <planeGeometry args={[BASE.width - 0.5, (BASE.width - 0.5) / 4]} />
          <meshStandardMaterial map={plate} roughness={0.5} metalness={0.3} />
        </mesh>
      )}
      <group position={[flow * (BASE.width / 2 - 0.22), BASE.height / 2 + 0.06, BASE.depth / 2 - 0.2]}>
        <Led color={powered ? "#22c55e" : "#f43f5e"} palette={palette} size={0.05} />
      </group>

      {/* insulators + copper hinge post and jaws */}
      {[hingeX, jawX].map((x) => (
        <group key={x} position={[x, BASE.height / 2, 0]}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.14, 0.17, 0.24, 20]} />
            <meshStandardMaterial color={palette.theme === "dark" ? "#e8e2d6" : "#f4efe6"} roughness={0.35} />
          </mesh>
          {[-0.09, 0.09].map((z) => (
            <mesh key={z} position={[0, 0.34, z]}>
              <boxGeometry args={[0.2, 0.22, 0.04]} />
              <meshStandardMaterial color="#c8823e" metalness={1} roughness={0.22} emissive={copperGlow} emissiveIntensity={powered ? 0.12 : 0} />
            </mesh>
          ))}
        </group>
      ))}

      {/* the knife blade, hinged at the post */}
      <group ref={blade} position={[hingeX, BASE.height / 2 + 0.34, 0]}>
        <mesh position={[flow * 0.85, 0, 0]}>
          <boxGeometry args={[1.7, 0.07, 0.12]} />
          <meshStandardMaterial color="#d18b46" metalness={1} roughness={0.18} emissive={copperGlow} emissiveIntensity={powered ? 0.25 : 0.04} />
        </mesh>
        <mesh position={[flow * 1.78, 0.18, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.36, 14]} />
          <meshStandardMaterial color="#121216" roughness={0.6} />
        </mesh>
        <mesh position={[flow * 1.78, 0.4, 0]}>
          <sphereGeometry args={[0.11, 18, 18]} />
          <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.55} roughness={0.3} />
        </mesh>
      </group>

      <primitive ref={arcLine} object={arc} />

      {/* clear safety cover over the contacts */}
      <group ref={cover}>
        <AcrylicCover width={BASE.width - 0.3} depth={BASE.depth - 0.5} thickness={0.06} transmission={transmission} />
      </group>

      {/* output socket where the page conduit leaves */}
      <group position={[0, -BASE.height / 2 - 0.05, BASE.depth / 2 - 0.25]}>
        <mesh>
          <cylinderGeometry args={[0.16, 0.16, 0.12, 24]} />
          <meshStandardMaterial color="#26272e" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh ref={ring} rotation-x={Math.PI / 2} position={[0, -0.05, 0]}>
          <torusGeometry args={[0.2, 0.012, 8, 40]} />
          <meshBasicMaterial color={arcColor} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </group>

      <Halo color={powered ? palette.pulse : palette.accent} palette={palette} size={4.2} y={-BASE.height / 2 - 0.02} intensity={powered ? 0.45 : 0.25} />
    </group>
  );
}
