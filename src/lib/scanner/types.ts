// Shared scanner types for AgentLint.

export type ConfigFormat =
  | "claude-desktop"
  | "cursor"
  | "vscode"
  | "unknown";

export type Severity = "critical" | "high" | "medium" | "info";

/** A single MCP server normalized into a common shape. */
export interface ParsedServer {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  /** Optional tool descriptions keyed by tool name (for poisoning analysis). */
  toolDescriptions?: Record<string, string>;
}

/** The parser's normalized output. */
export interface ParsedConfig {
  format: ConfigFormat;
  servers: ParsedServer[];
  raw: object;
}

/** A finding produced by a rule. */
export interface Finding {
  ruleId: string;
  severity: Severity;
  title: string;
  description: string;
  /** Which server triggered this (or "*" / "config" for global findings). */
  server: string;
  /** The specific config value/snippet that triggered the finding. */
  evidence: string;
  /** OWASP Agentic Top 10 category id, e.g. "ASI03". */
  owaspCategory: string;
  remediation: string;
}

export type RiskLevel = "critical" | "high" | "medium" | "low" | "clean";

/** Capability classification for lethal-trifecta analysis. */
export interface TrifectaState {
  dataAccess: boolean;
  untrustedContent: boolean;
  externalComms: boolean;
  /** Per-capability evidence: server names contributing to each axis. */
  contributors: {
    dataAccess: string[];
    untrustedContent: string[];
    externalComms: string[];
  };
}

/** The full scan result returned to the UI. */
export interface ScanResult {
  format: ConfigFormat;
  serverCount: number;
  riskLevel: RiskLevel;
  findings: Finding[];
  trifecta: TrifectaState;
  counts: Record<Severity, number>;
}

/** A rule is a pure function over the parsed config. */
export type Rule = (config: ParsedConfig) => Finding[];
