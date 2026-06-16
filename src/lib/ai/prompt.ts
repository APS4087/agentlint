// Provider-agnostic prompt-engineering layer.
//
// This is AgentLint's value-add: a single, carefully tuned prompt that produces
// a high-signal risk briefing regardless of which model the user brings. The
// user content is deliberately *redacted* — it never includes the raw config or
// the literal secret values the scanner flagged (the `evidence` field is omitted).

import type { ScanResult, Severity } from "@/lib/scanner/types";

export const SYSTEM_PROMPT = `You are a security analyst writing a short, plain-English risk briefing for a developer who just ran a static scan of their MCP (Model Context Protocol) server configuration.

You are given the deterministic findings from that scan. Explain the overall risk in context — what an attacker could actually achieve by chaining these issues, and what to fix first.

Rules:
- Be concise: 2–4 short paragraphs OR a tight bulleted list. No preamble, no restating the input, no closing pleasantries.
- Lead with the bottom line: how exposed is this config, and why.
- Prioritise by real-world impact, not by raw count. If a lethal trifecta is present (private-data access + exposure to untrusted content + the ability to communicate externally), explain the concrete exfiltration path it creates.
- Only discuss findings that were provided. Do NOT invent issues, servers, CVEs, or numbers.
- Be specific and actionable, but synthesise — do not just repeat each finding's remediation verbatim.
- Write for a competent engineer. Plain text or light Markdown (bold with **, hyphen bullets). No headings. Never output secret values.
- If there are no findings, say so plainly and give one sentence of caution that static analysis is not a guarantee of safety.`;

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  info: "INFO",
};

/**
 * Build the redacted user message from a scan result.
 * `evidence` is intentionally omitted — it can contain the literal secret the
 * scanner detected, which must never be sent to any third-party model.
 */
export const buildUserContent = (result: ScanResult): string => {
  const lines: string[] = [
    `Config format: ${result.format}`,
    `Servers scanned: ${result.serverCount}`,
    `Overall risk: ${result.riskLevel}`,
    `Finding counts — critical:${result.counts.critical} high:${result.counts.high} medium:${result.counts.medium} info:${result.counts.info}`,
  ];

  const t = result.trifecta;
  lines.push(
    `Lethal trifecta — private-data:${t.dataAccess} untrusted-content:${t.untrustedContent} external-comms:${t.externalComms}`,
  );

  lines.push("", "Findings:");
  if (result.findings.length === 0) {
    lines.push("(none — the static rules flagged nothing)");
  } else {
    for (const f of result.findings) {
      lines.push(
        `- [${SEVERITY_LABEL[f.severity]}] ${f.title} (server: ${f.server}, ${f.owaspCategory}) — ${f.description}`,
      );
    }
  }

  return lines.join("\n");
};
