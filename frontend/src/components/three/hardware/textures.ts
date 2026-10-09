import { CanvasTexture, SRGBColorSpace, type Texture } from "three";
import { displayColor, drawIcon, type IntegrationIcon } from "@/lib/integrations";

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

const FONT = `"Inter Variable", "IBM Plex Sans Arabic", system-ui, sans-serif`;
const MONO = `"JetBrains Mono Variable", ui-monospace, monospace`;

/** Front panel for a server-rack blade / profile chip: dark plate, label, vents and a status window. */
export function panelTexture(label: string, caption: string, accent: string, direction: "ltr" | "rtl", aspect = 4, icon?: IntegrationIcon | null): Texture | null {
  const iconKey = icon ? (icon.kind === "brand" ? icon.title : icon.name) : "";
  return canvasTexture(`panel:${label}:${caption}:${accent}:${direction}:${aspect}:${iconKey}`, Math.round(128 * aspect), 128, (ctx, w, h) => {
    ctx.fillStyle = "#15161c";
    ctx.fillRect(0, 0, w, h);
    // vents
    ctx.fillStyle = "#0b0b0f";
    const ventX = direction === "rtl" ? 24 : w - 120;
    for (let i = 0; i < 6; i++) ctx.fillRect(ventX + i * 16, 30, 8, h - 60);
    // accent stripe
    ctx.fillStyle = accent;
    ctx.fillRect(direction === "rtl" ? w - 14 : 6, 14, 8, h - 28);

    // the service's real integration mark on a light badge
    let start = direction === "rtl" ? w - 34 : 34;
    if (icon) {
      const badgeX = direction === "rtl" ? w - 34 - 84 : 34;
      ctx.fillStyle = "#f4f4f6";
      ctx.beginPath();
      ctx.roundRect(badgeX, 22, 84, 84, 16);
      ctx.fill();
      drawIcon(ctx, icon, badgeX + 14, 36, 56, displayColor(icon.hex, "light"));
      start = direction === "rtl" ? badgeX - 22 : badgeX + 84 + 22;
    }
    ctx.direction = direction;
    ctx.textAlign = direction === "rtl" ? "right" : "left";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(label, start, 58, w - 300);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `500 22px ${MONO}`;
    ctx.fillText(caption, start, 96, w - 300);
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

/**
 * Face of an n8n node tile: the integration's real icon centred on a transparent plate, plus the
 * green "executed" check badge n8n shows after a successful run.
 */
export function nodeFaceTexture(icon: IntegrationIcon, color: string, flow: 1 | -1): Texture | null {
  const id = icon.kind === "brand" ? icon.title : icon.name;
  return canvasTexture(`face:${id}:${color}:${flow}`, 256, 256, (ctx, w) => {
    ctx.clearRect(0, 0, w, w);
    drawIcon(ctx, icon, w * 0.27, w * 0.27, w * 0.46, color);
    const cx = flow === 1 ? w * 0.82 : w * 0.18;
    const cy = w * 0.82;
    ctx.fillStyle = "#3fb950";
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = w * 0.025;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.04, cy);
    ctx.lineTo(cx - w * 0.008, cy + w * 0.032);
    ctx.lineTo(cx + w * 0.045, cy - w * 0.035);
    ctx.stroke();
  });
}

/** The orange lightning marker n8n draws beside trigger nodes. */
export function boltTexture(): Texture | null {
  return canvasTexture("bolt", 128, 128, (ctx, w) => {
    ctx.clearRect(0, 0, w, w);
    ctx.save();
    ctx.scale(w / 24, w / 24);
    ctx.fillStyle = "#ff6d5a";
    ctx.fill(new Path2D("M13 2 3 14h9l-1 8 10-12h-9l1-8z"));
    ctx.restore();
  });
}
