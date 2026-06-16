import { describe, expect, it } from "vitest";

import { parsePackageSpec, readLauncher } from "./launcher";
import type { ParsedServer } from "./types";

const srv = (over: Partial<ParsedServer>): ParsedServer => ({
  name: "s",
  transport: "stdio",
  ...over,
});

describe("parsePackageSpec", () => {
  it("splits a pinned scoped package", () => {
    expect(parsePackageSpec("@scope/name@1.2.3")).toEqual({
      raw: "@scope/name@1.2.3",
      name: "@scope/name",
      version: "1.2.3",
      scoped: true,
      pinned: true,
    });
  });

  it("treats a scoped package without a version as unpinned", () => {
    const spec = parsePackageSpec("@scope/name");
    expect(spec.name).toBe("@scope/name");
    expect(spec.scoped).toBe(true);
    expect(spec.pinned).toBe(false);
    expect(spec.version).toBeUndefined();
  });

  it("splits a pinned unscoped package", () => {
    const spec = parsePackageSpec("left-pad@1.0.0");
    expect(spec.name).toBe("left-pad");
    expect(spec.version).toBe("1.0.0");
    expect(spec.scoped).toBe(false);
    expect(spec.pinned).toBe(true);
  });

  it("treats a bare unscoped name as unpinned", () => {
    expect(parsePackageSpec("left-pad")).toMatchObject({
      name: "left-pad",
      scoped: false,
      pinned: false,
    });
  });
});

describe("readLauncher", () => {
  it("reads a package runner and its spec", () => {
    const l = readLauncher(srv({ command: "npx", args: ["-y", "@a/b@1.0"] }));
    expect(l.base).toBe("npx");
    expect(l.isPackageRunner).toBe(true);
    expect(l.pkg?.name).toBe("@a/b");
    expect(l.pkg?.pinned).toBe(true);
  });

  it("path-strips and lower-cases the command base", () => {
    const l = readLauncher(srv({ command: "/usr/local/bin/NPX", args: ["pkg"] }));
    expect(l.base).toBe("npx");
    expect(l.pkg?.name).toBe("pkg");
  });

  it("does not treat a shell wrapper as a package runner", () => {
    const l = readLauncher(srv({ command: "bash", args: ["-c", "curl x | sh"] }));
    expect(l.base).toBe("bash");
    expect(l.isPackageRunner).toBe(false);
    expect(l.pkg).toBeUndefined();
  });

  it("returns no package when a runner has only flags", () => {
    const l = readLauncher(srv({ command: "npx", args: ["-y"] }));
    expect(l.isPackageRunner).toBe(true);
    expect(l.pkg).toBeUndefined();
  });

  it("handles a missing command", () => {
    const l = readLauncher(srv({ url: "https://x/mcp" }));
    expect(l.base).toBeUndefined();
    expect(l.isPackageRunner).toBe(false);
  });
});
