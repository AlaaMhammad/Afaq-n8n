import {
  siGmail,
  siGooglecalendar,
  siGoogleforms,
  siGooglegemini,
  siGooglemeet,
  siGooglesheets,
  siHubspot,
  siN8n,
  siPostgresql,
  siShopify,
  siTelegram,
  siWhatsapp,
  siZendesk,
  type SimpleIcon,
} from "simple-icons";
import { CORE_ICONS, type CoreIconName } from "./core-icons";

/**
 * Real icons for n8n nodes and services. Third-party integrations use their official marks
 * (simple-icons, CC0 path data; brands remain their owners' trademarks and are used only to name
 * the integration). n8n's own core nodes (Webhook, IF, Code, Form…) use matching glyphs.
 */
export type IntegrationIcon = { kind: "brand"; title: string; path: string; hex: string } | { kind: "core"; name: CoreIconName; hex: string };

const brand = (icon: SimpleIcon): IntegrationIcon => ({ kind: "brand", title: icon.title, path: icon.path, hex: `#${icon.hex}` });
const core = (name: CoreIconName, hex: string): IntegrationIcon => ({ kind: "core", name, hex });

/** n8n's brand coral, used for the logo and n8n-native trigger glyphs. */
export const N8N_CORAL = `#${siN8n.hex}`;
export const N8N_LOGO = brand(siN8n);

export const BRAND_ICONS: Record<string, IntegrationIcon> = {
  n8n: N8N_LOGO,
  gmail: brand(siGmail),
  googlesheets: brand(siGooglesheets),
  googlecalendar: brand(siGooglecalendar),
  googlegemini: brand(siGooglegemini),
  googlemeet: brand(siGooglemeet),
  googleforms: brand(siGoogleforms),
  whatsapp: brand(siWhatsapp),
  zendesk: brand(siZendesk),
  hubspot: brand(siHubspot),
  postgresql: brand(siPostgresql),
  shopify: brand(siShopify),
  telegram: brand(siTelegram),
};

/** Last segment of an n8n node type, lower-cased: `n8n-nodes-base.emailReadImap` → `emailreadimap`. */
const typeKey = (n8nType: string) => (n8nType.split(".").pop() ?? n8nType).toLowerCase();

const NODE_TYPES: Record<string, IntegrationIcon> = {
  webhook: core("webhook", N8N_CORAL),
  emailreadimap: core("mail", "#4a9eff"),
  formtrigger: core("clipboard-list", "#8fa3c8"),
  form: core("clipboard-list", "#8fa3c8"),
  errortrigger: core("circle-x", "#8fa3c8"),
  scheduletrigger: core("timer", N8N_CORAL),
  cron: core("timer", N8N_CORAL),
  switch: core("split", "#3fb950"),
  if: core("split", "#3fb950"),
  filter: core("funnel", "#3fb950"),
  code: core("braces", "#ff9b3d"),
  httprequest: core("globe", "#4a9eff"),
  agent: core("bot", "#e6e6e6"),
  chainllm: core("link", "#e6e6e6"),
  sentimentanalysis: core("smile", "#a78bfa"),
  informationextractor: core("scan-text", "#a78bfa"),
  memorybufferwindow: core("database", "#a78bfa"),
  extractfromfile: core("scan-text", "#ff9b3d"),
  clearbit: core("building-2", "#4a9eff"),
  postgres: BRAND_ICONS.postgresql,
  whatsapp: BRAND_ICONS.whatsapp,
  zendesk: BRAND_ICONS.zendesk,
  hubspot: BRAND_ICONS.hubspot,
  gmail: BRAND_ICONS.gmail,
  googlesheets: BRAND_ICONS.googlesheets,
  googlecalendar: BRAND_ICONS.googlecalendar,
  lmchatgooglegemini: BRAND_ICONS.googlegemini,
  googlegemini: BRAND_ICONS.googlegemini,
  telegram: BRAND_ICONS.telegram,
  shopify: BRAND_ICONS.shopify,
};

const KIND_FALLBACK: Record<string, IntegrationIcon> = {
  trigger: core("zap", N8N_CORAL),
  router: core("split", "#3fb950"),
  ai: core("brain-circuit", "#a78bfa"),
  storage: core("database", "#4a9eff"),
  action: core("workflow", "#e6e6e6"),
};

export function iconForNodeType(n8nType: string, kind?: string): IntegrationIcon {
  return NODE_TYPES[typeKey(n8nType)] ?? KIND_FALLBACK[kind ?? "action"] ?? KIND_FALLBACK.action;
}

/** `brand:whatsapp` → the WhatsApp mark; anything else is a lucide name handled by the caller. */
export function brandFromIconName(name: string | null | undefined): IntegrationIcon | null {
  if (!name?.startsWith("brand:")) return null;
  return BRAND_ICONS[name.slice(6)] ?? null;
}

/** Brand colours that vanish on a dark ground (e.g. Zendesk's near-black) render light instead. */
export function displayColor(hex: string, theme: "dark" | "light"): string {
  const value = parseInt(hex.slice(1), 16);
  const luminance = (0.299 * ((value >> 16) & 255) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255)) / 255;
  if (theme === "dark" && luminance < 0.28) return "#e6e6e6";
  if (theme === "light" && luminance > 0.85) return "#1f1f24";
  return hex;
}

/** Draws an icon into a 2D canvas at (x, y) with the given size (icons are authored on a 24×24 grid). */
export function drawIcon(ctx: CanvasRenderingContext2D, icon: IntegrationIcon, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  if (icon.kind === "brand") {
    ctx.fillStyle = color;
    ctx.fill(new Path2D(icon.path));
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const [tag, raw] of CORE_ICONS[icon.name]) {
      const a = raw as Record<string, string | number>;
      const n = (key: string) => Number(a[key] ?? 0);
      ctx.beginPath();
      if (tag === "path") ctx.stroke(new Path2D(String(a.d)));
      else if (tag === "circle") ctx.arc(n("cx"), n("cy"), n("r"), 0, Math.PI * 2);
      else if (tag === "ellipse") ctx.ellipse(n("cx"), n("cy"), n("rx"), n("ry"), 0, 0, Math.PI * 2);
      else if (tag === "rect") ctx.roundRect(n("x"), n("y"), n("width"), n("height"), n("rx"));
      else if (tag === "line") {
        ctx.moveTo(n("x1"), n("y1"));
        ctx.lineTo(n("x2"), n("y2"));
      }
      if (tag !== "path") ctx.stroke();
    }
  }
  ctx.restore();
}
