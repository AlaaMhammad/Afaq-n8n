import { CORE_ICONS } from "@/lib/integrations/core-icons";
import type { IntegrationIcon as Icon } from "@/lib/integrations";

interface IntegrationIconProps extends React.SVGProps<SVGSVGElement> {
  icon: Icon;
  /** Override the brand colour: `currentColor`, or any CSS colour incl. `light-dark(…)` (applied via style). */
  color?: string;
  title?: string;
}

/** Renders a real integration mark (brand path) or an n8n core-node glyph as inline SVG. */
export function IntegrationIcon({ icon, color, title, ...props }: IntegrationIconProps) {
  const fill = color ?? icon.hex;
  return (
    <svg viewBox="0 0 24 24" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} {...props}>
      {title && <title>{title}</title>}
      {icon.kind === "brand" ? (
        <path d={icon.path} style={{ fill }} />
      ) : (
        <g fill="none" style={{ stroke: fill }} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {CORE_ICONS[icon.name].map(([tag, attrs], index) => {
            const Tag = tag as "path";
            return <Tag key={index} {...(attrs as Record<string, string>)} />;
          })}
        </g>
      )}
    </svg>
  );
}
