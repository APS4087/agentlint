// Scanner orchestrator: parse → run rules → compute risk → assemble result.

import { analyzeTrifecta } from "./lethal-trifecta";
import { parseConfig, ConfigParseError } from "./parser";
import { runRules } from "./rules";
import type {
  ConfigFormat,
  Finding,
  RiskLevel,
  ScanResult,
  Severity,
} from "./types";

export { ConfigParseError } from "./parser";
export type { ScanResult } from "./types";

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  info: 3,
};

const countBySeverity = (findings: Finding[]): Record<Severity, number> => {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    info: 0,
  };
  for (const f of findings) counts[f.severity] += 1;
  return counts;
};

const computeRiskLevel = (counts: Record<Severity, number>): RiskLevel => {
  if (counts.critical > 0) return "critical";
  if (counts.high > 0) return "high";
  if (counts.medium > 0) return "medium";
  if (counts.info > 0) return "low";
  return "clean";
};

const sortFindings = (findings: Finding[]): Finding[] =>
  [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

/**
 * Run the full static scan over a raw JSON config string.
 * Throws ConfigParseError if the input cannot be parsed.
 */
export const scanConfig = (
  input: string,
  hint?: ConfigFormat | "auto",
): ScanResult => {
  const parsed = parseConfig(input, hint);
  const findings = sortFindings(runRules(parsed));
  const counts = countBySeverity(findings);
  const trifecta = analyzeTrifecta(parsed.servers);

  return {
    format: parsed.format,
    serverCount: parsed.servers.length,
    riskLevel: computeRiskLevel(counts),
    findings,
    trifecta,
    counts,
  };
};

export const isParseError = (err: unknown): err is ConfigParseError =>
  err instanceof ConfigParseError;
