import { CanvasTexture, SRGBColorSpace, type Texture } from "three";

/**
 * Procedural textures drawn on 2D canvases (no image downloads). Cached per key so a scene with
 * many identical parts shares one GPU texture. Canvas text rendering shapes Arabic correctly.
 */
const cache = new Map<string, Texture | null>();

function canvasTexture(key: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): Texture | null {
  if (cache.has(key)) return cache.get(key)!;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    cache.set(key, null);
    return null;
  }
  draw(ctx, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}

/** Deterministic pseudo-random sequence so a board looks the same on every visit. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const FONT = `"Inter Variable", "IBM Plex Sans Arabic", system-ui, sans-serif`;
const MONO = `"JetBrains Mono Variable", ui-monospace, monospace`;

/** Printed circuit board: solder mask, copper traces, vias, a chip and silkscreen. */
export function pcbTexture(seed: string, accent: string, theme: "dark" | "light"): Texture | null {
  return canvasTexture(`pcb:${seed}:${accent}:${theme}`, 256, 256, (ctx, w, h) => {
    const random = seeded(seed);
    ctx.fillStyle = theme === "dark" ? "#0d1f1c" : "#1f4a3f";
    ctx.fillRect(0, 0, w, h);

    // Copper traces: orthogonal runs with 45° doglegs, like routed tracks.
    ctx.strokeStyle = theme === "dark" ? "#b0793a" : "#d39a52";
    ctx.lineCap = "round";
    for (let i = 0; i < 22; i++) {
      ctx.lineWidth = random() > 0.7 ? 3 : 1.6;
      let x = random() * w;
      let y = random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 3; s++) {
        const len = 20 + random() * 60;
        const dir = Math.floor(random() * 4);
        const dx = [1, -1, 0, 0][dir] * len;
        const dy = [0, 0, 1, -1][dir] * len;
        const bend = 8 * (random() > 0.5 ? 1 : -1);
        x += dx + (dy ? bend : 0);
        y += dy + (dx ? bend : 0);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "#e0b070";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central chip with pins and the accent die marking.
    const cw = w * 0.34;
    const cx = (w - cw) / 2;
    ctx.fillStyle = "#cfd3da";
    for (let p = 0; p < 8; p++) {
      ctx.fillRect(cx + 6 + p * (cw - 12) / 7 - 2, cx - 8, 4, 8);
      ctx.fillRect(cx + 6 + p * (cw - 12) / 7 - 2, cx + cw, 4, 8);
    }
    ctx.fillStyle = "#16161b";
    ctx.fillRect(cx, cx, cw, cw);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(cx + 10, cx + 10, 4, 0, Math.PI * 2);
    ctx.fill();

    // Silkscreen
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `600 13px ${MONO}`;
    ctx.fillText(`AFQ-${seed.slice(0, 6).toUpperCase()}`, 10, h - 12);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(4, 4, w - 8, h - 8);
  });
}

/**
 * Screen-printed label for a node's acrylic cover: integration name, node label and an accent bar.
 * Transparent background so it reads as print on clear acrylic.
 */
export function decalTexture(title: string, subtitle: string, accent: string, direction: "ltr" | "rtl"): Texture | null {
  return canvasTexture(`decal:${title}:${subtitle}:${accent}:${direction}`, 512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.direction = direction;
    const start = direction === "rtl" ? w - 36 : 36;
    ctx.textAlign = direction === "rtl" ? "right" : "left";

    ctx.fillStyle = accent;
    ctx.fillRect(direction === "rtl" ? w - 36 - 70 : 36, 34, 70, 10);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `800 64px ${FONT}`;
    ctx.fillText(title, start, 128, w - 72);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `500 38px ${FONT}`;
    ctx.fillText(subtitle, start, 192, w - 72);
  });
}

/** Front panel for a server-rack blade / profile chip: dark plate, label, vents and a status window. */
export function panelTexture(label: string, caption: string, accent: string, direction: "ltr" | "rtl", aspect = 4): Texture | null {
  return canvasTexture(`panel:${label}:${caption}:${accent}:${direction}:${aspect}`, Math.round(128 * aspect), 128, (ctx, w, h) => {
    ctx.fillStyle = "#15161c";
    ctx.fillRect(0, 0, w, h);
    // vents
    ctx.fillStyle = "#0b0b0f";
    const ventX = direction === "rtl" ? 24 : w - 120;
    for (let i = 0; i < 6; i++) ctx.fillRect(ventX + i * 16, 30, 8, h - 60);
    // accent stripe
    ctx.fillStyle = accent;
    ctx.fillRect(direction === "rtl" ? w - 14 : 6, 14, 8, h - 28);

    ctx.direction = direction;
    ctx.textAlign = direction === "rtl" ? "right" : "left";
    const start = direction === "rtl" ? w - 34 : 34;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(label, start, 58, w - 190);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `500 22px ${MONO}`;
    ctx.fillText(caption, start, 96, w - 190);
  });
}

/**
 * Holographic profile chip face: gradient film, monogram badge, name and role, and SIM-style gold
 * contact pads — the "hardware business card" of a team member.
 */
export function chipTexture(monogramText: string, name: string, role: string, accent: string, pulse: string, direction: "ltr" | "rtl"): Texture | null {
  return canvasTexture(`chip:${monogramText}:${name}:${role}:${accent}:${direction}`, 512, 320, (ctx, w, h) => {
    const film = ctx.createLinearGradient(0, 0, w, h);
    film.addColorStop(0, "#101118");
    film.addColorStop(0.55, "#161a24");
    film.addColorStop(1, "#0d1016");
    ctx.fillStyle = film;
    ctx.fillRect(0, 0, w, h);
    // holographic sheen
    const sheen = ctx.createLinearGradient(0, h, w, 0);
    sheen.addColorStop(0, "rgba(0,229,255,0)");
    sheen.addColorStop(0.5, `${pulse}33`);
    sheen.addColorStop(1, "rgba(255,107,0,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = `${pulse}88`;
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    const rtl = direction === "rtl";
    const badgeX = rtl ? w - 92 : 92;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(badgeX, 96, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0b0b0f";
    ctx.font = `800 50px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(monogramText, badgeX, 100);

    ctx.textBaseline = "alphabetic";
    ctx.direction = direction;
    ctx.textAlign = rtl ? "right" : "left";
    const textX = rtl ? w - 168 : 168;
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = `700 36px ${FONT}`;
    ctx.fillText(name, textX, 86, w - 196);
    ctx.fillStyle = pulse;
    ctx.font = `500 26px ${FONT}`;
    ctx.fillText(role, textX, 126, w - 196);

    // gold contact pads
    ctx.fillStyle = "#c9a14a";
    for (let i = 0; i < 6; i++) ctx.fillRect((rtl ? w - 64 - 6 * 44 : 40) + i * 44, h - 92, 34, 52);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `500 18px ${MONO}`;
    ctx.textAlign = rtl ? "left" : "right";
    ctx.fillText("AFQ · NEURAL LINK", rtl ? 24 : w - 24, h - 24);
  });
}
