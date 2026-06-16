// Parses raw MCP config JSON into a normalized ParsedConfig.

import type { ConfigFormat, ParsedConfig, ParsedServer } from "./types";

export class ConfigParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigParseError";
  }
}

type RawServer = {
  command?: unknown;
  args?: unknown;
  env?: unknown;
  url?: unknown;
  headers?: unknown;
  toolDescriptions?: unknown;
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const asStringRecord = (
  v: unknown,
): Record<string, string> | undefined => {
  if (!isObject(v)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    out[k] = typeof val === "string" ? val : JSON.stringify(val);
  }
  return out;
};

const asStringArray = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  return v.map((item) => (typeof item === "string" ? item : JSON.stringify(item)));
};

const normalizeServer = (name: string, value: unknown): ParsedServer => {
  if (!isObject(value)) {
    throw new ConfigParseError(`Server "${name}" must be an object.`);
  }
  const raw = value as RawServer;
  return {
    name,
    command: typeof raw.command === "string" ? raw.command : undefined,
    args: asStringArray(raw.args),
    env: asStringRecord(raw.env),
    url: typeof raw.url === "string" ? raw.url : undefined,
    headers: asStringRecord(raw.headers),
    toolDescriptions: asStringRecord(raw.toolDescriptions),
  };
};

/**
 * Parse a raw JSON string into a normalized config.
 *
 * @param input  Raw JSON text.
 * @param hint   Optional format hint from the UI dropdown. "auto" / undefined
 *               triggers auto-detection.
 */
export const parseConfig = (
  input: string,
  hint?: ConfigFormat | "auto",
): ParsedConfig => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new ConfigParseError("Config is empty.");
  }

  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch (err) {
    throw new ConfigParseError(
      `Invalid JSON: ${err instanceof Error ? err.message : "parse error"}`,
    );
  }

  if (!isObject(json)) {
    throw new ConfigParseError("Top-level config must be a JSON object.");
  }

  const hasMcpServers = isObject(json.mcpServers);
  const hasServers = isObject(json.servers);

  let serverMap: Record<string, unknown>;
  let format: ConfigFormat;

  if (hint === "vscode" && hasServers) {
    serverMap = json.servers as Record<string, unknown>;
    format = "vscode";
  } else if (
    (hint === "claude-desktop" || hint === "cursor") &&
    hasMcpServers
  ) {
    serverMap = json.mcpServers as Record<string, unknown>;
    format = hint;
  } else if (hasMcpServers) {
    serverMap = json.mcpServers as Record<string, unknown>;
    format = "claude-desktop";
  } else if (hasServers) {
    serverMap = json.servers as Record<string, unknown>;
    format = "vscode";
  } else {
    throw new ConfigParseError(
      'No MCP servers found. Expected a top-level "mcpServers" (Claude/Cursor) or "servers" (VS Code) object.',
    );
  }

  const servers = Object.entries(serverMap).map(([name, value]) =>
    normalizeServer(name, value),
  );

  if (servers.length === 0) {
    throw new ConfigParseError("Config contains no servers.");
  }

  return { format, servers, raw: json };
};
