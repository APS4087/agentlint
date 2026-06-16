// How an MCP server is launched, interpreted once for every rule that needs it.
//
// Rules and the lethal-trifecta classifier all need to answer the same string
// questions about a server's command/args: what binary launches it, is that a
// package runner (npx/uvx/…), and if so what package — name, version, is it
// scoped, is it pinned. This module hides that parsing behind a small interface
// so callers consume meaning instead of re-deriving it (and re-introducing the
// kind of bug where pin/scope detection drifts between rules).

import type { ParsedServer } from "./types";

const PACKAGE_RUNNERS = ["npx", "uvx", "pnpx", "bunx"];

/** A package spec as written in args, e.g. "@scope/name@1.2.3" or "left-pad". */
export interface PackageSpec {
  /** The spec exactly as written. */
  raw: string;
  /** Package name with any version stripped; scope's leading @ kept. */
  name: string;
  /** The version/tag after the delimiter @, if present. */
  version?: string;
  /** Starts with an @scope/ prefix. */
  scoped: boolean;
  /** Has an explicit version pin (name@version). */
  pinned: boolean;
}

/** What launches a server and, if it's a package runner, what it installs. */
export interface Launcher {
  /** Command base name, path-stripped and lower-cased; undefined if no command. */
  base?: string;
  /** True when the base is a package runner (npx/uvx/pnpx/bunx). */
  isPackageRunner: boolean;
  /** The package spec the runner installs, when one is present. */
  pkg?: PackageSpec;
}

const baseName = (command?: string): string | undefined =>
  command ? command.split(/[\\/]/).pop()?.toLowerCase() : undefined;

const isFlag = (token: string): boolean => token.startsWith("-");

/** The first arg that reads as a package spec rather than a flag. */
const looksLikePackage = (token: string): boolean =>
  !isFlag(token) && (token.startsWith("@") || /^[a-z0-9]/i.test(token));

/**
 * Split a raw spec into name/version, handling scoped packages. The version
 * delimiter is the last "@" that isn't the scope's leading "@".
 */
export const parsePackageSpec = (raw: string): PackageSpec => {
  const scoped = raw.startsWith("@");
  const at = raw.lastIndexOf("@");
  const hasVersion = scoped ? at > 0 : at >= 0;
  const version = hasVersion ? raw.slice(at + 1) : undefined;
  return {
    raw,
    name: hasVersion ? raw.slice(0, at) : raw,
    version,
    scoped,
    pinned: Boolean(version && version.length > 0),
  };
};

/** Interpret how a server is launched and what package (if any) it runs. */
export const readLauncher = (server: ParsedServer): Launcher => {
  const base = baseName(server.command);
  const isPackageRunner = base !== undefined && PACKAGE_RUNNERS.includes(base);
  const specArg = isPackageRunner
    ? (server.args ?? []).find(looksLikePackage)
    : undefined;
  return {
    base,
    isPackageRunner,
    pkg: specArg ? parsePackageSpec(specArg) : undefined,
  };
};
