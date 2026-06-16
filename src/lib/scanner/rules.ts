// Deterministic static-analysis rules for MCP configs.
// Each rule is a pure function returning zero or more findings.

import { readLauncher } from "./launcher";
import {
  analyzeTrifecta,
  trifectaCount,
} from "./lethal-trifecta";
import type { Finding, ParsedConfig, ParsedServer, Rule } from "./types";

const truncate = (value: string, max = 200): string =>
  value.length > max ? `${value.slice(0, max)}…` : value;

// ---------------------------------------------------------------------------
// Rule 1 — Hardcoded Secrets (CRITICAL, ASI03)
// ---------------------------------------------------------------------------

const SECRET_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "OpenAI/Anthropic-style key (sk-)", re: /\bsk-[A-Za-z0-9_-]{16,}/ },
  { label: "GitHub personal token (ghp_)", re: /\bghp_[A-Za-z0-9]{20,}/ },
  { label: "GitHub OAuth token (gho_)", re: /\bgho_[A-Za-z0-9]{20,}/ },
  { label: "GitHub fine-grained PAT", re: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
  { label: "Slack bot token (xoxb-)", re: /\bxoxb-[A-Za-z0-9-]{10,}/ },
  { label: "Slack user token (xoxp-)", re: /\bxoxp-[A-Za-z0-9-]{10,}/ },
  { label: "AWS access key id (AKIA)", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "JSON Web Token (eyJ)", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { label: "PEM private key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { label: "Google API key (AIza)", re: /\bAIza[0-9A-Za-z_-]{30,}/ },
  // Generic high-entropy-ish token: 32+ hex or base64-ish chars.
  { label: "Generic API key / token", re: /\b[A-Fa-f0-9]{32,}\b|\b[A-Za-z0-9+/]{40,}={0,2}\b/ },
];

// Env var names that legitimately hold secrets — but a *reference* like
// "${GITHUB_TOKEN}" or "$VAR" is fine; only literals are flagged.
const isReference = (value: string): boolean =>
  /^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?$/.test(value.trim());

const scanSecretsIn = (
  server: ParsedServer,
  location: string,
  pairs: [string, string][],
): Finding[] => {
  const findings: Finding[] = [];
  for (const [key, value] of pairs) {
    if (!value || isReference(value)) continue;
    for (const { label, re } of SECRET_PATTERNS) {
      const match = value.match(re);
      if (match) {
        findings.push({
          ruleId: "hardcoded-secrets",
          severity: "critical",
          title: "Hardcoded secret detected",
          description: `A ${label} appears to be hardcoded in ${location} (${key}). Secrets committed to config files are easily leaked and grant attackers direct access.`,
          server: server.name,
          evidence: truncate(`${key}: ${match[0]}`),
          owaspCategory: "ASI03",
          remediation:
            "Use environment variable references (e.g. \"${GITHUB_TOKEN}\") instead of hardcoding secrets, and rotate any key that was committed.",
        });
        break; // one finding per value is enough
      }
    }
  }
  return findings;
};

const ruleHardcodedSecrets: Rule = (config) =>
  config.servers.flatMap((s) => [
    ...scanSecretsIn(s, "env", Object.entries(s.env ?? {})),
    ...scanSecretsIn(s, "headers", Object.entries(s.headers ?? {})),
    ...scanSecretsIn(
      s,
      "args",
      (s.args ?? []).map((a, i) => [`arg[${i}]`, a]),
    ),
  ]);

// ---------------------------------------------------------------------------
// Rule 2 — Dangerous Commands (HIGH, ASI05)
// ---------------------------------------------------------------------------

const SHELL_COMMANDS = ["bash", "sh", "zsh", "cmd", "cmd.exe", "powershell", "pwsh", "eval", "exec"];
const NETWORK_TOOLS = ["curl", "wget", "nc", "netcat", "ncat"];
const SHELL_OPERATORS = ["|", "&&", "||", ";", ">", ">>", "<", "`", "$("];

const ruleDangerousCommands: Rule = (config) => {
  const findings: Finding[] = [];
  for (const s of config.servers) {
    const base = readLauncher(s).base ?? "";

    if (SHELL_COMMANDS.includes(base)) {
      findings.push({
        ruleId: "dangerous-commands",
        severity: "high",
        title: "Server launched via a shell interpreter",
        description: `The command "${s.command}" invokes a shell/interpreter directly, which can execute arbitrary code rather than a fixed MCP binary.`,
        server: s.name,
        evidence: `command: ${s.command}`,
        owaspCategory: "ASI05",
        remediation:
          "Use the specific MCP server binary directly instead of a shell wrapper.",
      });
    }

    const tokens = [base, ...(s.args ?? []).map((a) => a.toLowerCase())];
    for (const tool of NETWORK_TOOLS) {
      if (tokens.includes(tool)) {
        findings.push({
          ruleId: "dangerous-commands",
          severity: "high",
          title: `Use of network/download tool (${tool})`,
          description: `"${tool}" can fetch and run remote payloads at launch, a common foothold for supply-chain and RCE attacks.`,
          server: s.name,
          evidence: `command/args contain: ${tool}`,
          owaspCategory: "ASI05",
          remediation:
            "Avoid piping downloaded content into the shell. Use the specific MCP server binary directly.",
        });
        break;
      }
    }

    for (const arg of s.args ?? []) {
      const op = SHELL_OPERATORS.find((o) => arg.includes(o));
      if (op) {
        findings.push({
          ruleId: "dangerous-commands",
          severity: "high",
          title: "Shell operator found in arguments",
          description: `The argument contains the shell operator "${op}", suggesting command chaining or redirection that can execute unintended commands.`,
          server: s.name,
          evidence: truncate(arg),
          owaspCategory: "ASI05",
          remediation:
            "Pass arguments as discrete values without shell metacharacters; run the MCP binary directly.",
        });
        break;
      }
    }
  }
  return findings;
};

// ---------------------------------------------------------------------------
// Rule 3 — Broad Filesystem Access (HIGH, ASI02)
// ---------------------------------------------------------------------------

const BROAD_PATHS = ["/", "~", "/home", "/etc", "/var", "/root", "/usr", "/private"];
const WINDOWS_BROAD = [/^[a-z]:\\?$/i, /^[a-z]:\\users\\?$/i];

const ruleBroadFilesystem: Rule = (config) => {
  const findings: Finding[] = [];
  for (const s of config.servers) {
    for (const arg of s.args ?? []) {
      const trimmed = arg.trim();
      const isBroadUnix = BROAD_PATHS.includes(trimmed);
      const isBroadWin = WINDOWS_BROAD.some((re) => re.test(trimmed));
      const isGlob = trimmed.includes("**") || trimmed.endsWith("*.*") || trimmed === "*";

      if (isBroadUnix || isBroadWin || isGlob) {
        findings.push({
          ruleId: "broad-filesystem",
          severity: "high",
          title: "Overly broad filesystem access",
          description: `The path "${trimmed}" grants the server access to a large or system-level part of the filesystem, far beyond what a single project needs.`,
          server: s.name,
          evidence: `arg: ${truncate(trimmed)}`,
          owaspCategory: "ASI02",
          remediation:
            "Restrict filesystem access to specific project directories only (e.g. /Users/you/projects/app).",
        });
      }
    }
  }
  return findings;
};

// ---------------------------------------------------------------------------
// Rule 4 — Missing Authentication (HIGH, ASI03)
// ---------------------------------------------------------------------------

const ruleMissingAuth: Rule = (config) => {
  const findings: Finding[] = [];
  for (const s of config.servers) {
    if (!s.url) continue;

    const hasAuth = Object.keys(s.headers ?? {}).some(
      (h) => h.toLowerCase() === "authorization" || h.toLowerCase() === "x-api-key",
    );
    if (!hasAuth) {
      findings.push({
        ruleId: "missing-auth",
        severity: "high",
        title: "Remote MCP server without authentication",
        description: `Server "${s.name}" connects to a remote URL but sends no Authorization/X-API-Key header. Anyone who can reach the endpoint — or who can MITM it — can impersonate this client.`,
        server: s.name,
        evidence: `url: ${truncate(s.url)}`,
        owaspCategory: "ASI03",
        remediation:
          "Add an Authorization header (bearer token) for remote MCP servers.",
      });
    }

    if (/^http:\/\//i.test(s.url)) {
      findings.push({
        ruleId: "missing-auth",
        severity: "high",
        title: "Remote MCP server uses plaintext HTTP",
        description: `Server "${s.name}" uses an http:// URL. Traffic — including any tokens — is sent unencrypted and can be intercepted.`,
        server: s.name,
        evidence: `url: ${truncate(s.url)}`,
        owaspCategory: "ASI03",
        remediation: "Use https:// for all remote MCP servers.",
      });
    }
  }
  return findings;
};

// ---------------------------------------------------------------------------
// Rule 5 — Unpinned Packages (MEDIUM, ASI04)
// ---------------------------------------------------------------------------

const ruleUnpinnedPackages: Rule = (config) => {
  const findings: Finding[] = [];
  for (const s of config.servers) {
    const { base, isPackageRunner, pkg } = readLauncher(s);
    if (!isPackageRunner || !pkg) continue;

    if (!pkg.pinned) {
      findings.push({
        ruleId: "unpinned-packages",
        severity: "medium",
        title: "Unpinned package version",
        description: `"${base} ${pkg.raw}" installs the latest version at runtime with no version pin. A compromised or rug-pulled release would be pulled in automatically.`,
        server: s.name,
        evidence: `${base} ${truncate(pkg.raw)}`,
        owaspCategory: "ASI04",
        remediation:
          "Pin the exact version (e.g. @scope/package@1.2.3) to prevent silent supply-chain changes.",
      });
    }
  }
  return findings;
};

// ---------------------------------------------------------------------------
// Rule 6 — Suspicious Tool Descriptions (CRITICAL, ASI01)
// ---------------------------------------------------------------------------

const EXFIL_KEYWORDS = ["send to", "forward to", "upload to", "post to", "exfiltrate", "email to"];
const TOOL_REFERENCE_RE = /when\s+(the\s+)?[\w.-]+\s+(tool|is called|runs)/i;
const BASE64_BLOB_RE = /\b[A-Za-z0-9+/]{40,}={0,2}\b/;
// Unicode bidi/zero-width tricks used to hide instructions.
const UNICODE_TRICKS_RE = /[‪-‮⁦-⁩​-‏⁠]/;

const ruleSuspiciousDescriptions: Rule = (config) => {
  const findings: Finding[] = [];
  for (const s of config.servers) {
    const descs = s.toolDescriptions ?? {};
    for (const [tool, desc] of Object.entries(descs)) {
      const lower = desc.toLowerCase();
      const reasons: string[] = [];

      if (/<important>/i.test(desc) || /<\/?(secret|system|instructions?)>/i.test(desc)) {
        reasons.push("hidden-instruction tag (e.g. <IMPORTANT>)");
      }
      if (TOOL_REFERENCE_RE.test(desc)) {
        reasons.push("references another tool's invocation (cross-tool manipulation)");
      }
      if (EXFIL_KEYWORDS.some((k) => lower.includes(k))) {
        reasons.push("exfiltration phrasing (send/forward/upload/post to ...)");
      }
      if (BASE64_BLOB_RE.test(desc)) {
        reasons.push("long base64-like blob (possible encoded payload)");
      }
      if (UNICODE_TRICKS_RE.test(desc)) {
        reasons.push("Unicode direction-override / zero-width characters");
      }

      if (reasons.length > 0) {
        findings.push({
          ruleId: "suspicious-descriptions",
          severity: "critical",
          title: `Tool poisoning indicators in "${tool}" description`,
          description: `The description for tool "${tool}" contains: ${reasons.join("; ")}. Hidden instructions in tool descriptions are read by the LLM but not shown to users — a primary MCP attack vector.`,
          server: s.name,
          evidence: truncate(desc, 280),
          owaspCategory: "ASI01",
          remediation:
            "Review and sanitize all tool descriptions. Reject tools whose descriptions contain instructions, encoded blobs, or invisible characters.",
        });
      }
    }
  }
  return findings;
};

// ---------------------------------------------------------------------------
// Rule 7 — Lethal Trifecta (CRITICAL/HIGH, ASI02)
// ---------------------------------------------------------------------------

const ruleLethalTrifecta: Rule = (config) => {
  const state = analyzeTrifecta(config.servers);
  const count = trifectaCount(state);
  if (count < 2) return [];

  const present: string[] = [];
  if (state.dataAccess)
    present.push(`private-data access (${state.contributors.dataAccess.join(", ")})`);
  if (state.untrustedContent)
    present.push(`untrusted content (${state.contributors.untrustedContent.join(", ")})`);
  if (state.externalComms)
    present.push(`external communication (${state.contributors.externalComms.join(", ")})`);

  if (count === 3) {
    return [
      {
        ruleId: "lethal-trifecta",
        severity: "critical",
        title: "Lethal trifecta present",
        description: `This config combines all three lethal-trifecta capabilities — ${present.join("; ")}. An attacker who plants instructions in untrusted content can make the agent read private data and exfiltrate it externally.`,
        server: "config",
        evidence: present.join(" + "),
        owaspCategory: "ASI02",
        remediation:
          "Separate agents by trust boundary. Never combine data-access, untrusted-content, and external-communication tools in a single agent.",
      },
    ];
  }

  return [
    {
      ruleId: "lethal-trifecta",
      severity: "high",
      title: "Two of three lethal-trifecta capabilities present",
      description: `This config combines two trifecta capabilities — ${present.join("; ")}. Adding the third would make data exfiltration trivially achievable; treat this as one step away from critical.`,
      server: "config",
      evidence: present.join(" + "),
      owaspCategory: "ASI02",
      remediation:
        "Keep the missing capability out of this agent, and review whether these two truly need to coexist.",
    },
  ];
};

// ---------------------------------------------------------------------------
// Rule 8 — Privilege Escalation (HIGH, ASI03)
// ---------------------------------------------------------------------------

const PRIV_TOKENS = [
  "sudo",
  "--privileged",
  "--cap-add",
  "--security-opt",
  "/var/run/docker.sock",
  "--user=root",
  "--user root",
];

const rulePrivilegeEscalation: Rule = (config) => {
  const findings: Finding[] = [];
  for (const s of config.servers) {
    const blob = [s.command ?? "", ...(s.args ?? [])].join(" ").toLowerCase();
    for (const token of PRIV_TOKENS) {
      if (blob.includes(token)) {
        findings.push({
          ruleId: "privilege-escalation",
          severity: "high",
          title: `Privilege escalation pattern (${token})`,
          description: `The server invocation contains "${token}", granting elevated host privileges. A compromised MCP server with this access can take over the host.`,
          server: s.name,
          evidence: truncate(blob),
          owaspCategory: "ASI03",
          remediation:
            "Run MCP servers with least privilege. Never mount the Docker socket or use privileged/root mode.",
        });
        break;
      }
    }

    for (const [k, v] of Object.entries(s.env ?? {})) {
      if (k === "DOCKER_HOST" || k === "KUBECONFIG") {
        findings.push({
          ruleId: "privilege-escalation",
          severity: "high",
          title: `Sensitive orchestration env var (${k})`,
          description: `Env var "${k}" exposes container/cluster control to this MCP server, which can be abused to escalate from the agent into your infrastructure.`,
          server: s.name,
          evidence: `${k}: ${truncate(v)}`,
          owaspCategory: "ASI03",
          remediation:
            "Do not expose DOCKER_HOST/KUBECONFIG to MCP servers; scope infrastructure access narrowly and never to production.",
        });
      }
    }
  }
  return findings;
};

// ---------------------------------------------------------------------------
// Rule 9 — Network Exposure (MEDIUM, ASI07)
// ---------------------------------------------------------------------------

const ruleNetworkExposure: Rule = (config) => {
  const findings: Finding[] = [];
  for (const s of config.servers) {
    const args = s.args ?? [];
    const blob = args.join(" ");
    const exposed =
      blob.includes("0.0.0.0") ||
      /(^|\s)\*:\d+/.test(blob) ||
      /--host\s+0\.0\.0\.0/.test(blob) ||
      args.some((a, i) => a === "--host" && args[i + 1] === "0.0.0.0");

    if (exposed) {
      findings.push({
        ruleId: "network-exposure",
        severity: "medium",
        title: "Server bound to all interfaces",
        description: `Server "${s.name}" appears to bind to 0.0.0.0 / all interfaces, exposing it beyond localhost and potentially to the local network or internet.`,
        server: s.name,
        evidence: truncate(blob),
        owaspCategory: "ASI07",
        remediation:
          "Bind MCP servers to 127.0.0.1 (localhost) only unless remote access is explicitly required and authenticated.",
      });
    }
  }
  return findings;
};

// ---------------------------------------------------------------------------
// Rule 10 — Unscoped / Unknown Packages (MEDIUM, ASI04)
// ---------------------------------------------------------------------------

const KNOWN_GOOD_UNSCOPED = new Set([
  "npx",
  "uvx",
  "node",
  "python",
  "python3",
  "deno",
  "bun",
]);

const ruleUnscopedPackages: Rule = (config) => {
  const findings: Finding[] = [];
  for (const s of config.servers) {
    const { base, isPackageRunner, pkg } = readLauncher(s);
    if (!isPackageRunner || !pkg) continue;
    if (pkg.scoped) continue; // scoped — handled elsewhere

    const nameOnly = pkg.name;
    const reasons: string[] = [];
    if (!KNOWN_GOOD_UNSCOPED.has(nameOnly)) reasons.push("unscoped (no @org/ prefix)");
    if (nameOnly.length <= 3) reasons.push("very short name (typosquatting risk)");

    if (reasons.length > 0) {
      findings.push({
        ruleId: "unscoped-packages",
        severity: "medium",
        title: "Unscoped or unknown package",
        description: `Package "${pkg.raw}" is ${reasons.join(" and ")}. Unscoped packages are easier to typosquat or impersonate than scoped, verified ones.`,
        server: s.name,
        evidence: `${base} ${truncate(pkg.raw)}`,
        owaspCategory: "ASI04",
        remediation:
          "Prefer scoped packages from known publishers (e.g. @modelcontextprotocol/...). Verify authenticity before installing.",
      });
    }
  }
  return findings;
};

// ---------------------------------------------------------------------------

export const RULES: Rule[] = [
  ruleHardcodedSecrets,
  ruleDangerousCommands,
  ruleBroadFilesystem,
  ruleMissingAuth,
  ruleUnpinnedPackages,
  ruleSuspiciousDescriptions,
  ruleLethalTrifecta,
  rulePrivilegeEscalation,
  ruleNetworkExposure,
  ruleUnscopedPackages,
];

export const runRules = (config: ParsedConfig): Finding[] =>
  RULES.flatMap((rule) => rule(config));
