// Lethal Trifecta analysis (Simon Willison, June 2025).
//
// Three capabilities, when combined in one agent, guarantee exploitability:
//   1. Access to private data
//   2. Exposure to untrusted content
//   3. Ability to communicate externally
//
// We categorize each server by a known-package lookup table plus keyword
// heuristics over the package/server name.

import { parsePackageSpec } from "./launcher";
import type { ParsedServer, TrifectaState } from "./types";

export interface Capabilities {
  dataAccess: boolean;
  untrustedContent: boolean;
  externalComms: boolean;
}

const EMPTY: Capabilities = {
  dataAccess: false,
  untrustedContent: false,
  externalComms: false,
};

/** Known MCP server packages → capability fingerprint. */
const KNOWN_PACKAGES: Record<string, Capabilities> = {
  "@modelcontextprotocol/server-filesystem": {
    dataAccess: true,
    // File *contents* can be untrusted, but local-FS access is canonically a
    // data-access capability. Pairing it with a fetch/web server (untrusted)
    // is what completes the trifecta — see Willison's filesystem+fetch+email.
    untrustedContent: false,
    externalComms: false,
  },
  "@modelcontextprotocol/server-fetch": {
    dataAccess: false,
    untrustedContent: true,
    externalComms: true,
  },
  "@modelcontextprotocol/server-github": {
    dataAccess: true,
    untrustedContent: true, // issues/PRs are untrusted content
    externalComms: true,
  },
  "@modelcontextprotocol/server-gitlab": {
    dataAccess: true,
    untrustedContent: true,
    externalComms: true,
  },
  "@modelcontextprotocol/server-postgres": {
    dataAccess: true,
    untrustedContent: false,
    externalComms: false,
  },
  "@modelcontextprotocol/server-sqlite": {
    dataAccess: true,
    untrustedContent: false,
    externalComms: false,
  },
  "@modelcontextprotocol/server-memory": {
    dataAccess: true,
    untrustedContent: false,
    externalComms: false,
  },
  "@modelcontextprotocol/server-git": {
    dataAccess: true,
    untrustedContent: false,
    externalComms: false,
  },
  "@modelcontextprotocol/server-slack": {
    dataAccess: true,
    untrustedContent: true,
    externalComms: true,
  },
  "@modelcontextprotocol/server-google-maps": {
    dataAccess: false,
    untrustedContent: true,
    externalComms: true,
  },
  "@modelcontextprotocol/server-brave-search": {
    dataAccess: false,
    untrustedContent: true,
    externalComms: true,
  },
  "@modelcontextprotocol/server-puppeteer": {
    dataAccess: false,
    untrustedContent: true,
    externalComms: true,
  },
  "@modelcontextprotocol/server-sentry": {
    dataAccess: true,
    untrustedContent: true,
    externalComms: false,
  },
};

// Keyword heuristics keyed by capability. Matched against the lower-cased
// server name + command + args blob.
const DATA_ACCESS_KEYWORDS = [
  "filesystem",
  "file-system",
  "files",
  "fs",
  "postgres",
  "mysql",
  "sqlite",
  "mongodb",
  "database",
  "db",
  "git",
  "github",
  "gitlab",
  "memory",
  "drive",
  "gdrive",
  "notion",
  "obsidian",
  "vault",
  "keychain",
  "credential",
];

const UNTRUSTED_CONTENT_KEYWORDS = [
  "fetch",
  "web",
  "browser",
  "puppeteer",
  "playwright",
  "search",
  "brave",
  "crawl",
  "scrape",
  "rss",
  "email",
  "gmail",
  "imap",
  "mail",
  "slack",
  "discord",
  "issue",
  "comment",
  "maps",
];

const EXTERNAL_COMMS_KEYWORDS = [
  "fetch",
  "http",
  "request",
  "webhook",
  "smtp",
  "email-send",
  "sendmail",
  "slack",
  "discord",
  "telegram",
  "post",
  "upload",
  "api",
  "github",
  "gitlab",
];

const matchAny = (haystack: string, keywords: string[]): boolean =>
  keywords.some((k) => haystack.includes(k));

/** Find a known package fingerprint from the args (npx/uvx package specs). */
const knownPackageMatch = (server: ParsedServer): Capabilities | undefined => {
  const tokens = [...(server.args ?? []), server.command ?? ""];
  for (const token of tokens) {
    // parsePackageSpec strips the version pin while keeping the scope's @.
    const base = parsePackageSpec(token).name;
    if (KNOWN_PACKAGES[base]) return KNOWN_PACKAGES[base];
    if (KNOWN_PACKAGES[token]) return KNOWN_PACKAGES[token];
  }
  return undefined;
};

/** Classify a single server's capabilities. */
export const classifyServer = (server: ParsedServer): Capabilities => {
  const known = knownPackageMatch(server);
  if (known) return known;

  const blob = [
    server.name,
    server.command ?? "",
    ...(server.args ?? []),
    server.url ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const caps: Capabilities = {
    dataAccess: matchAny(blob, DATA_ACCESS_KEYWORDS),
    untrustedContent: matchAny(blob, UNTRUSTED_CONTENT_KEYWORDS),
    externalComms: matchAny(blob, EXTERNAL_COMMS_KEYWORDS),
  };

  // A remote (url-based) server can always communicate externally.
  if (server.url) caps.externalComms = true;

  return caps;
};

/** Aggregate capabilities across all servers in a config. */
export const analyzeTrifecta = (servers: ParsedServer[]): TrifectaState => {
  const state: TrifectaState = {
    dataAccess: false,
    untrustedContent: false,
    externalComms: false,
    contributors: { dataAccess: [], untrustedContent: [], externalComms: [] },
  };

  for (const server of servers) {
    const caps = classifyServer(server);
    if (caps.dataAccess) {
      state.dataAccess = true;
      state.contributors.dataAccess.push(server.name);
    }
    if (caps.untrustedContent) {
      state.untrustedContent = true;
      state.contributors.untrustedContent.push(server.name);
    }
    if (caps.externalComms) {
      state.externalComms = true;
      state.contributors.externalComms.push(server.name);
    }
  }

  return state;
};

export const trifectaCount = (state: TrifectaState): number =>
  [state.dataAccess, state.untrustedContent, state.externalComms].filter(
    Boolean,
  ).length;

export const EMPTY_CAPABILITIES = EMPTY;
