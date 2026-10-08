# React Three Fiber Components

Stack: `three`, `@react-three/fiber` (v9, React 19), `@react-three/drei`, `@react-three/postprocessing` (Bloom), `gsap`. All 3D code lives in `src/components/three/` and is loaded **client-only** with `next/dynamic(..., { ssr: false })` so it never blocks first paint.

## 1. Component tree

```mermaid
flowchart TD
    SC["&lt;SceneCanvas&gt;<br/>WebGL check · Suspense · DPR · PerformanceMonitor"]
    SC --> LT["&lt;Lighting/&gt;<br/>ambient + key + rim (orange/cyan)"]
    SC --> ENV["&lt;Environment preset='city'/&gt; (high tier only)"]
    SC --> CR["&lt;CameraRig/&gt;<br/>lerps to sceneStore.cameraGoal"]
    SC --> FX["&lt;Effects/&gt;<br/>Bloom (high/medium)"]
    SC --> SLOT{{"scene slot"}}
    SLOT --> HC["&lt;AutomationCore/&gt; (Hero)"]
    SLOT --> WS["&lt;WorkflowScene workflow=…/&gt; (Portfolio)"]
    WS --> ED["&lt;ExplodeDriver/&gt;<br/>GSAP tween of explodeProgress"]
    WS --> WN["&lt;WorkflowNode/&gt; × n"]
    WS --> WE["&lt;WorkflowEdge/&gt; × m"]
    WE --> PK["&lt;DataPackets/&gt; instanced particles"]
    WN --> NL["&lt;NodeLabel/&gt; drei &lt;Text&gt; (RTL aware)"]
    WN --> PT["&lt;NodePorts/&gt;"]
```

## 2. `<SceneCanvas>` — wrapper

```tsx
interface SceneCanvasProps {
  children: React.ReactNode;
  className?: string;
  /** Rendered when WebGL is unavailable or quality === 'fallback2d' */
  fallback: React.ReactNode;
  camera?: { position: [number, number, number]; fov?: number };
  interactive?: boolean;          // enables OrbitControls
  frameloop?: 'always' | 'demand'; // 'demand' for hero when offscreen
}
```

Responsibilities:
1. **WebGL detection** — `isWebGL2Available()` (from `three/examples/jsm/capabilities/WebGL.js`) in a `useEffect`; renders `fallback` if false.
2. **Visibility** — `IntersectionObserver` switches `frameloop` to `'never'` when the canvas is off-screen (saves battery on mobile).
3. **Performance** — drei `<PerformanceMonitor onDecline={stepDown} onIncline={stepUp} flipflops={3} onFallback={() => setQuality('fallback2d')}>` and `<AdaptiveDpr pixelated />`.
4. **DPR** by tier: high `[1, 2]`, medium `[1, 1.5]`, low `1`.
5. **Suspense** with a lightweight `<CanvasLoader/>` (drei `useProgress`) inside the canvas.
6. **Accessibility** — wrapper has `role="img"` + localized `aria-label`; all 3D interactions have DOM-button equivalents (Explode/Assemble toggle, node list).

Quality tiers:

| Tier | DPR | Bloom | Env map | Packets per edge | Shadows |
|------|-----|-------|---------|------------------|---------|
| high | 1–2 | ✓ (intensity 1.2) | ✓ | 24 | contact shadows |
| medium | 1–1.5 | ✓ (0.8) | ✗ | 12 | ✗ |
| low | 1 | ✗ | ✗ | 6 | ✗ |
| fallback2d | — | — | — | — | SVG diagram |

Initial tier: `low` if `navigator.hardwareConcurrency <= 4` or a coarse pointer + width < 768, else `high`.

## 3. Procedural nodes

No external GLTF models in v1 — every node is procedural geometry (tiny bundles, instant load, easy to theme).

| `kind` | Geometry | Material | Signature detail |
|--------|----------|----------|------------------|
| `trigger` | `OctahedronGeometry(0.6)` stretched on Y (diamond) | `MeshPhysicalMaterial` metalness 0.8, roughness 0.25, emissive orange | Slow Y-rotation; pulse ring on activation |
| `router` | `CylinderGeometry(0.5, 0.5, 0.9, 32)` | carbon body + emissive cyan band (`TorusGeometry`) | Output ports fan out on explode |
| `action` | `RoundedBox` (drei) 1×1×1, radius 0.08 | dark carbon with edge glow (`Edges` drei, orange) | Inner core cube visible when exploded |
| `ai` | `IcosahedronGeometry(0.6, 1)` | `MeshTransmissionMaterial` (high) / emissive wire (low) | Inner rotating wireframe "brain" |
| `storage` | 3 stacked `CylinderGeometry` discs | metallic | Discs separate vertically on explode |

```tsx
interface WorkflowNodeProps {
  node: WorkflowNodeData;              // from workflow_metadata.nodes (locale-resolved label)
  accent?: string;                     // default var(--color-accent) resolved to hex
  onSelect?: (id: string) => void;
}
```

Each node:
- Position per frame: `lerpVec(node.position, node.position + node.exploded, easeInOutCubic(explodeProgress))` computed inside `useFrame` (no React state).
- Hover → `hoverNode(id)`, cursor pointer, emissive intensity ×1.6, label scales up.
- Click → `selectNode(id)`, camera focuses node (`focusCamera`), side panel shows `n8nType`, stats.
- When exploded, the node also separates into **shell + core** sub-meshes (shell offset outward by 0.25 along view-facing normal) — the "exploded view" of the node itself.

## 4. Edges & data packets

`<WorkflowEdge from to animated />`:
- Curve: `CatmullRomCurve3` through `[start, midLifted, end]` where `midLifted` raises Y by `0.6 + 0.4 * explodeProgress` (laser arcs bend more when exploded).
- Rendering: drei `<Line>` (meshline) width 1.5, color cyan `#00E5FF`, `dashed` with animated `dashOffset` = "laser beam".
- Curve points are recomputed in `useFrame` only when `explodeProgress` changed by > 0.001.

`<DataPackets curve count speed />`:
- One `InstancedMesh` of small spheres (`SphereGeometry(0.05, 8, 8)`) per edge, additive blending, orange → cyan gradient by `t`.
- Each instance has phase offset `i / count`; position = `curve.getPointAt((time * speed + phase) % 1)`.
- Respects reduced motion: packets are static at evenly spaced points.

## 5. Exploded-view animation

```mermaid
stateDiagram-v2
    [*] --> Assembled
    Assembled --> Exploding: setMode('exploded')<br/>(click · scroll · AI action)
    Exploding --> Exploded: tween complete
    Exploded --> Assembling: setMode('assembled')
    Assembling --> Assembled: tween complete
    Exploding --> Assembling: interrupted (reverse from current progress)
```

`<ExplodeDriver/>`:

```tsx
useEffect(() => useSceneStore.subscribe(
  (s) => s.mode,
  (mode) => {
    tween.current?.kill();
    const target = { p: useSceneStore.getState().explodeProgress };
    tween.current = gsap.to(target, {
      p: mode === 'exploded' ? 1 : 0,
      duration: reducedMotion ? 0 : 1.4,
      ease: mode === 'exploded' ? 'expo.out' : 'power3.inOut',
      onUpdate: () => useSceneStore.getState()._setExplodeProgress(target.p),
    });
  },
), []);
```

"Physics-driven" feel: each node adds a damped spring wobble on top of the tween — `wobble = sin(t * 8 + seed) * exp(-t * 4) * 0.06` during the first 600 ms after a mode change — and staggered start (`delay = index * 0.05`).

Triggers:
- **Click** — "Explode / Assemble" toggle button (DOM) and double-click on canvas.
- **Scroll** — GSAP `ScrollTrigger` on the portfolio section: entering 60% viewport → exploded; leaving → assembled (only if the user hasn't manually toggled in this visit).
- **AI** — `trigger_3d_workflow` action via `AgentActionRunner`.

## 6. Hero `<AutomationCore/>`

Ambient centrepiece: a slowly rotating icosahedron core (orange emissive) wrapped by three orbit rings of tiny nodes (cyan points) with packets travelling along torus knots. Mouse parallax (±0.15 rad) on desktop; gyroscope disabled. Runs `frameloop="demand"` with a 30 fps throttle on `low` tier.

## 7. Labels & RTL in 3D

drei `<Text>` (troika) renders Arabic with correct shaping when given an Arabic-capable font:
- Fonts: `/fonts/IBMPlexSansArabic-Medium.woff` (ar) and `/fonts/Inter-Medium.woff` (en), passed via `font` prop based on locale.
- Props: `direction={locale === 'ar' ? 'rtl' : 'ltr'}`, `anchorX="center"`, `maxWidth={2.2}`, `sdfGlyphSize={64}`.
- Labels billboard toward the camera (drei `<Billboard>`).
- Precompute glyphs with `preloadFont` during Suspense to avoid flashes.

## 8. File layout

```
src/components/three/
├── scene-canvas.tsx
├── camera-rig.tsx
├── lighting.tsx
├── effects.tsx
├── fallback-diagram.tsx        # SVG 2D fallback using the same workflow data
├── hero/automation-core.tsx
├── workflow/
│   ├── workflow-scene.tsx
│   ├── explode-driver.tsx
│   ├── workflow-node.tsx
│   ├── nodes/{trigger,router,action,ai,storage}-node.tsx
│   ├── workflow-edge.tsx
│   ├── data-packets.tsx
│   └── node-label.tsx
└── utils/{easing,vectors,quality}.ts
```

## 9. Performance budget

| Metric | Target |
|--------|--------|
| 3D JS chunk (gzipped) | ≤ 250 KB (three tree-shaken, drei per-import) |
| Draw calls (portfolio scene) | ≤ 60 |
| Mobile frame time (mid-range Android) | ≤ 22 ms (≥ 45 fps) on `low` |
| LCP impact | none — canvas hydrates after LCP; poster image shown first |

## 10. As built (Phase 5)

Where this section differs from §1–§9, this section wins (ADR-015/016/017).

```
src/components/three/
├── scene-canvas.tsx          # Canvas wrapper: frameloop "never" off-screen, DPR/AA by tier, PerformanceMonitor,
│                             # context-loss + error-boundary → 2D fallback, first-frame onReady
├── lighting.tsx              # ambient + key + orange/cyan rims + procedural <Environment> (Lightformers, no HDR download)
├── effects.tsx               # lazy Bloom (luminanceThreshold 1 → only HDR glow parts bloom); high/medium + dark only
├── hero/automation-core.tsx  # hero centrepiece (transparent canvas, halo sprites instead of post-processing)
├── workflow/
│   ├── workflow-canvas.tsx   # default export, loaded with next/dynamic({ ssr: false })
│   ├── workflow-sim.ts       # per-node springs, hover "peek", live positions (pure, unit-tested)
│   ├── workflow-node.tsx     # positions a node per frame, hover/select → scene store, projects its label
│   ├── node-meshes.tsx       # trigger · router · action · ai · storage (shell + core explode)
│   ├── workflow-edge.tsx     # dashed fat line ("laser"), port sockets, instanced packets (orange → cyan)
│   ├── camera-rig.tsx        # glides to the fitted overview / selected node; OrbitControls on fine pointers only
│   └── label-layer.tsx       # single DOM label layer (ADR-016)
└── utils/{spring,quality,camera,edge,textures}.ts
src/components/portfolio/     # DOM side: WorkflowStage, WorkflowDiagram2D (poster + fallback), WorkflowSteps, useScrollExplode
src/lib/hooks/                # useMediaQuery/useReducedMotion/useFinePointer, useSceneSupport/useIdle/useNearViewport
src/lib/theme/palette.ts      # TS mirror of the colour tokens for Three.js
```

**Explode/assemble triggers.** All four drive one value: `sceneStore.mode`.
- *Click*: the Explode/Assemble button, or a double-click on the canvas.
- *Scroll*: at ≥ 60 % in view the workflow explodes after 650 ms, and reassembles once fully out of view. It replays on a project switch, and stops for the visit once the visitor or the agent sets a mode.
- *Hover*: the node "peeks", opening its own shell and core. This also works on the 2D diagram and the step list.
- *AI*: `trigger_3d_workflow` → `setMode(mode, "agent")`.

**Exploded view** works at two levels:
- The workflow spreads nodes along `position + exploded × spring`.
- Each node splits its own geometry: trigger cage, router band and fins, action lid and base around a glowing core, AI glass shell and brain, storage platters.

**Quality tiers** (`utils/quality.ts`):

| Tier | DPR | Bloom | MSAA | Packets / edge | AI glass |
|------|-----|-------|------|----------------|----------|
| high | 1–2 | 1.15 | 4 | 24 | transmission |
| medium | 1–1.5 | 0.8 | — | 12 | translucent |
| low | 1 | — | — | 6 | translucent |
| fallback2d | — | — | — | — | SVG/DOM diagram |

- **Initial tier:**
  - `low`: data-saver, ≤ 4 cores, ≤ 4 GB memory, or a phone (coarse pointer under 768 px)
  - `medium`: a tablet or ≤ 6 cores
  - `high`: everything else
- **At runtime:** drei `PerformanceMonitor` steps the tier between high and low. Its `onFallback` switches to 2D unless the visitor pinned 3D with the 2D/3D switch.

**Resilience.** Each failure case and what happens:

| Situation | Result |
|---|---|
| No WebGL | 2D diagram plus a notice |
| Render error | Error boundary → 2D |
| First WebGL context loss | 2D, then one automatic remount after 1.5 s (`renderAttempt` keys the canvas) |
| Second context loss | Stays in 2D |
| Off-screen | `frameloop="never"` |
| Reduced motion | Instant transitions, static packets, no sway or parallax, camera snaps |
| Touch devices | No OrbitControls, so the page keeps scrolling natively |

**Bundle** (production build): three.js, R3F and drei are absent from the initial JS. The lazy 3D core is about 232 KB gzipped, plus about 8 KB per scene; Bloom is a separate ~21 KB chunk.

**RTL**: `localizeWorkflow()` mirrors X, so Arabic workflows flow right → left. Labels are DOM text with `dir="auto"`, so Arabic shapes correctly.
