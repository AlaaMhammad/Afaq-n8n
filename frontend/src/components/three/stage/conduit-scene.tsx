"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { AdditiveBlending, CatmullRomCurve3, Color, NormalBlending, Object3D, TubeGeometry, Vector3, type Group, type InstancedMesh, type Mesh } from "three";
import { useReducedMotion } from "@/lib/hooks/use-media-query";
import { scenePalette } from "@/lib/theme/palette";
import { useSceneStore } from "@/stores/scene-store";

const RADIAL = 6;
const PACKETS = 18;
const GUTTER = 28;

interface ConduitPath {
  curve: CatmullRomCurve3;
  segments: number;
  /** Page-space Y of evenly spaced (arc-length) samples — maps scroll position to path progress. */
  sampleY: Float32Array;
  key: string;
}

/**
 * Builds the conduit route from the page's `[data-stage-anchor]` placeholders: it leaves the hero
 * switch, runs down the content's outer edge and loops through every section's 3D vignette.
 * Coordinates are CSS pixels (orthographic camera), page-space Y negated.
 */
export function buildConduitPath(anchors: { x: number; y: number }[], pageHeight: number, viewportWidth: number, rtl: boolean): ConduitPath | null {
  if (anchors.length === 0) return null;
  const edgeX = rtl ? GUTTER : viewportWidth - GUTTER;
  const points: Vector3[] = [];
  const toWorld = (x: number, y: number) => new Vector3(x - viewportWidth / 2, -y, 0);

  anchors.forEach((anchor, i) => {
    if (i > 0) {
      const previous = anchors[i - 1];
      const mid = (previous.y + anchor.y) / 2;
      points.push(toWorld(edgeX, previous.y + (mid - previous.y) * 0.5), toWorld(edgeX, mid + (anchor.y - mid) * 0.5));
    }
    points.push(toWorld(anchor.x, anchor.y));
  });
  const last = anchors[anchors.length - 1];
  points.push(toWorld(edgeX, last.y + 160), toWorld(edgeX, pageHeight));

  const curve = new CatmullRomCurve3(points, false, "centripetal");
  const length = curve.getLength();
  const segments = Math.min(1500, Math.max(64, Math.round(length / 14)));
  const sampleY = new Float32Array(segments + 1);
  const point = new Vector3();
  for (let i = 0; i <= segments; i++) sampleY[i] = -curve.getPointAt(i / segments, point).y;
  return { curve, segments, sampleY, key: `${anchors.map((a) => `${a.x | 0},${a.y | 0}`).join(";")}:${pageHeight | 0}:${viewportWidth}` };
}

/** Fraction of the path (0–1) whose page Y is above `pageY` (the path flows downward). */
export function fractionAbove(sampleY: Float32Array, pageY: number): number {
  let lit = 0;
  for (let i = 0; i < sampleY.length; i++) if (sampleY[i] <= pageY) lit = i;
  return sampleY.length > 1 ? lit / (sampleY.length - 1) : 0;
}

function readAnchors(): { x: number; y: number }[] {
  const scrollY = window.scrollY;
  return Array.from(document.querySelectorAll<HTMLElement>("[data-stage-anchor]"))
    .map((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      // The hero conduit leaves from the bottom of the switch; elsewhere it passes through the centre.
      const yRatio = element.dataset.stageAnchor === "hero" ? 0.82 : 0.5;
      return { x: rect.left + rect.width / 2, y: rect.top + scrollY + rect.height * yRatio };
    })
    .filter((anchor): anchor is { x: number; y: number } => anchor !== null)
    .sort((a, b) => a.y - b.y);
}

export function ConduitScene({ theme }: { theme: string | undefined }) {
  const palette = scenePalette(theme);
  const reducedMotion = useReducedMotion();
  const [path, setPath] = useState<ConduitPath | null>(null);
  const root = useRef<Group>(null);
  const lit = useRef<Mesh>(null);
  const packets = useRef<InstancedMesh>(null);
  const shown = useRef(0);
  const work = useMemo(() => ({ dummy: new Object3D(), point: new Vector3() }), []);

  // Re-route when the layout changes (resize, fonts, images, content height).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const rebuild = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = buildConduitPath(readAnchors(), document.documentElement.scrollHeight, window.innerWidth, document.dir === "rtl");
        setPath((current) => (current?.key === next?.key ? current : next));
      }, 150);
    };
    rebuild();
    const observer = new ResizeObserver(rebuild);
    observer.observe(document.body);
    const interval = setInterval(rebuild, 2500); // anchors that mount late (lazy sections)
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  const geometries = useMemo(() => {
    if (!path) return null;
    return {
      sheath: new TubeGeometry(path.curve, path.segments, 6, RADIAL, false),
      core: new TubeGeometry(path.curve, path.segments, 1.4, RADIAL, false),
      lit: new TubeGeometry(path.curve, path.segments, 2.2, RADIAL, false),
    };
  }, [path]);
  useEffect(() => () => Object.values(geometries ?? {}).forEach((g) => g.dispose()), [geometries]);

  const colors = useMemo(
    () => ({
      sheath: new Color(palette.pulse),
      core: new Color(palette.theme === "dark" ? "#2a2f3a" : "#b9bfcc"),
      lit: new Color(palette.pulse).multiplyScalar(palette.glow),
      packet: new Color(palette.accent).multiplyScalar(palette.glow),
    }),
    [palette],
  );

  useFrame(({ clock }, dt) => {
    if (!path || !root.current) return;
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    root.current.position.y = scrollY + viewportHeight / 2;

    const scene = useSceneStore.getState();
    if (!scene.powered && scrollY > 40) scene.setPowered(true);

    // Energy flows down to just below the fold as you scroll — once the hero switch is closed.
    const target = scene.powered ? fractionAbove(path.sampleY, scrollY + viewportHeight * 0.9) : 0;
    shown.current = reducedMotion ? target : shown.current + (target - shown.current) * (1 - Math.exp(-dt * 2.5));
    if (lit.current) lit.current.geometry.setDrawRange(0, Math.floor(shown.current * path.segments) * RADIAL * 6);

    const mesh = packets.current;
    if (!mesh) return;
    for (let i = 0; i < PACKETS; i++) {
      const u = (((reducedMotion ? 0 : clock.elapsedTime * 0.05) + i / PACKETS) % 1) * shown.current;
      path.curve.getPointAt(u, work.dummy.position);
      work.dummy.scale.setScalar(shown.current > 0.01 ? 1 : 0);
      work.dummy.updateMatrix();
      mesh.setMatrixAt(i, work.dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const blending = palette.additive ? AdditiveBlending : NormalBlending;

  return (
    <>
      <OrthographicCamera makeDefault position={[0, 0, 500]} near={1} far={1000} />
      {geometries && (
        <group ref={root}>
          <mesh geometry={geometries.sheath}>
            <meshBasicMaterial color={colors.sheath} transparent opacity={palette.additive ? 0.07 : 0.1} blending={blending} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh geometry={geometries.core}>
            <meshBasicMaterial color={colors.core} transparent opacity={0.8} depthWrite={false} />
          </mesh>
          <mesh ref={lit} geometry={geometries.lit}>
            <meshBasicMaterial color={colors.lit} transparent opacity={palette.additive ? 0.85 : 0.9} blending={blending} depthWrite={false} toneMapped={false} />
          </mesh>
          <instancedMesh ref={packets} args={[undefined, undefined, PACKETS]} frustumCulled={false}>
            <sphereGeometry args={[3.5, 8, 8]} />
            <meshBasicMaterial color={colors.packet} toneMapped={false} transparent blending={blending} depthWrite={false} />
          </instancedMesh>
        </group>
      )}
    </>
  );
}
