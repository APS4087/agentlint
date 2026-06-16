import type { Severity } from "@/lib/scanner/types";

export const SEVERITY_META: Record<
  Severity,
  { label: string; filled: number; color: string }
> = {
  critical: { label: "Critical", filled: 4, color: "var(--color-sev-critical)" },
  high: { label: "High", filled: 3, color: "var(--color-sev-high)" },
  medium: { label: "Medium", filled: 2, color: "var(--color-sev-medium)" },
  info: { label: "Info", filled: 1, color: "var(--color-sev-info)" },
};

/**
 * The signature glyph: a 4-dot meter where the number of filled dots encodes
 * severity rank. Echoes Nothing's Glyph interface; monochrome except critical.
 */
export const SeverityDots = ({
  filled,
  color,
  size = 7,
}: {
  filled: number;
  color: string;
  size?: number;
}) => (
  <span className="inline-flex items-center gap-[3px]" aria-hidden>
    {[0, 1, 2, 3].map((i) => (
      <span
        key={i}
        className="rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: i < filled ? color : "transparent",
          boxShadow: i < filled ? "none" : "inset 0 0 0 1px var(--color-line)",
        }}
      />
    ))}
  </span>
);

export const SeverityIndicator = ({
  severity,
  showLabel = true,
}: {
  severity: Severity;
  showLabel?: boolean;
}) => {
  const meta = SEVERITY_META[severity];
  return (
    <span className="inline-flex items-center gap-2">
      <SeverityDots filled={meta.filled} color={meta.color} />
      {showLabel && (
        <span
          className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]"
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>
      )}
    </span>
  );
};
