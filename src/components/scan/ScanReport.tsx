import { FindingCard } from "@/components/scan/FindingCard";
import { LethalTrifectaViz } from "@/components/scan/LethalTrifectaViz";
import {
  SEVERITY_META,
  SeverityDots,
} from "@/components/shared/SeverityIndicator";
import type { RiskLevel, ScanResult, Severity } from "@/lib/scanner/types";

const RISK_META: Record<
  RiskLevel,
  { label: string; color: string; filled: number }
> = {
  critical: { label: "Critical", color: "var(--color-accent)", filled: 4 },
  high: { label: "High", color: "var(--color-ink)", filled: 3 },
  medium: { label: "Medium", color: "var(--color-ink-soft)", filled: 2 },
  low: { label: "Low", color: "var(--color-ink-faint)", filled: 1 },
  clean: { label: "Clean", color: "var(--color-ink)", filled: 0 },
};

const SEVERITY_SECTIONS: Severity[] = ["critical", "high", "medium", "info"];

export const ScanReport = ({ result }: { result: ScanResult }) => {
  const risk = RISK_META[result.riskLevel];
  const total = result.findings.length;
  const trifectaPresent =
    [
      result.trifecta.dataAccess,
      result.trifecta.untrustedContent,
      result.trifecta.externalComms,
    ].filter(Boolean).length >= 2;

  return (
    <section className="space-y-4" aria-label="Scan report">
      {/* Verdict header — spec-sheet style */}
      <div className="border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <span className="label">Verdict</span>
          <span className="label">FMT · {result.format}</span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 p-5">
          <div>
            <SeverityDots filled={risk.filled} color={risk.color} size={11} />
            <div
              className="mt-3 text-4xl font-semibold uppercase tracking-tight sm:text-5xl"
              style={{ color: risk.color }}
            >
              {risk.label}
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              {total} {total === 1 ? "issue" : "issues"} ·{" "}
              {result.serverCount}{" "}
              {result.serverCount === 1 ? "server" : "servers"}
            </p>
          </div>

          {/* Severity tally */}
          <div className="grid w-full grid-cols-2 gap-px border border-line bg-line sm:w-auto sm:grid-cols-4">
            {SEVERITY_SECTIONS.map((sev) => (
              <div
                key={sev}
                className="flex flex-col items-center gap-1.5 bg-surface px-4 py-3"
              >
                <SeverityDots
                  filled={SEVERITY_META[sev].filled}
                  color={SEVERITY_META[sev].color}
                  size={5}
                />
                <span className="font-mono text-2xl font-bold leading-none text-ink">
                  {result.counts[sev]}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                  {SEVERITY_META[sev].label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {trifectaPresent && <LethalTrifectaViz trifecta={result.trifecta} />}

      {total === 0 ? (
        <div className="border border-line bg-surface p-6">
          <span className="label">No findings</span>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            The static rules found nothing. This is not a guarantee of safety —
            review tool behavior and trust boundaries manually before granting
            an agent access.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {SEVERITY_SECTIONS.map((sev) => {
            const group = result.findings.filter((f) => f.severity === sev);
            if (group.length === 0) return null;
            return (
              <div key={sev} className="space-y-2">
                <div className="flex items-center gap-2">
                  <SeverityDots
                    filled={SEVERITY_META[sev].filled}
                    color={SEVERITY_META[sev].color}
                  />
                  <h3
                    className="font-mono text-[11px] font-bold uppercase tracking-[0.16em]"
                    style={{ color: SEVERITY_META[sev].color }}
                  >
                    {SEVERITY_META[sev].label}
                  </h3>
                  <span className="font-mono text-[11px] text-ink-faint">
                    [{group.length}]
                  </span>
                </div>
                {group.map((finding, i) => (
                  <FindingCard
                    key={`${finding.ruleId}-${finding.server}-${i}`}
                    finding={finding}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
