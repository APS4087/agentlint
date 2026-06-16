import { describe, expect, it } from "vitest";

import { EXAMPLE_CONFIGS } from "./examples";
import { isParseError, scanConfig } from "./index";

const ruleIds = (json: string): string[] =>
  scanConfig(json).findings.map((f) => f.ruleId);

const example = (id: "safe" | "risky" | "malicious"): string =>
  EXAMPLE_CONFIGS.find((e) => e.id === id)!.json;

describe("scanConfig — example configs (regression baseline)", () => {
  it("the safe config scans clean", () => {
    const r = scanConfig(example("safe"));
    expect(r.riskLevel).toBe("clean");
    expect(r.findings).toHaveLength(0);
  });

  it("the risky config is critical with the expected findings", () => {
    const r = scanConfig(example("risky"));
    expect(r.riskLevel).toBe("critical");
    expect(r.findings).toHaveLength(7);
    expect(new Set(r.findings.map((f) => f.ruleId))).toEqual(
      new Set([
        "hardcoded-secrets",
        "broad-filesystem",
        "missing-auth",
        "unpinned-packages",
        "lethal-trifecta",
      ]),
    );
  });

  it("the malicious config is critical with poisoning + trifecta", () => {
    const r = scanConfig(example("malicious"));
    expect(r.riskLevel).toBe("critical");
    expect(r.findings).toHaveLength(9);
    const ids = new Set(r.findings.map((f) => f.ruleId));
    expect(ids).toContain("suspicious-descriptions");
    expect(ids).toContain("dangerous-commands");
    expect(ids).toContain("lethal-trifecta");
    expect(ids).toContain("unscoped-packages");
  });
});

describe("scanConfig — findings are severity-sorted", () => {
  it("orders critical before lower severities", () => {
    const order = ["critical", "high", "medium", "info"];
    const sev = scanConfig(example("malicious")).findings.map((f) => f.severity);
    const idx = sev.map((s) => order.indexOf(s));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });
});

describe("scanConfig — parsing & formats", () => {
  it("rejects empty input", () => {
    expect.assertions(1);
    try {
      scanConfig("   ");
    } catch (err) {
      expect(isParseError(err)).toBe(true);
    }
  });

  it("rejects invalid JSON", () => {
    expect(() => scanConfig("{not json")).toThrow();
  });

  it("rejects a config with no server map", () => {
    expect(() => scanConfig('{"foo": 1}')).toThrow();
  });

  it("detects the VS Code 'servers' format", () => {
    const r = scanConfig(
      '{"servers": {"fs": {"command": "npx", "args": ["-y", "@a/b@1.0"]}}}',
    );
    expect(r.format).toBe("vscode");
    expect(r.serverCount).toBe(1);
  });
});

describe("scanConfig — targeted rule behavior", () => {
  it("flags a hardcoded literal secret but not an env reference", () => {
    const literal =
      '{"mcpServers": {"s": {"command": "node", "env": {"K": "ghp_AbCdEf0123456789AbCdEf0123456789AbCd"}}}}';
    const ref =
      '{"mcpServers": {"s": {"command": "node", "env": {"K": "${GITHUB_TOKEN}"}}}}';
    expect(ruleIds(literal)).toContain("hardcoded-secrets");
    expect(ruleIds(ref)).not.toContain("hardcoded-secrets");
  });

  it("flags plaintext http remote servers", () => {
    const ids = ruleIds('{"mcpServers": {"r": {"url": "http://x.example/mcp"}}}');
    expect(ids).toContain("missing-auth");
  });

  it("does not flag a pinned scoped package as unpinned", () => {
    const ids = ruleIds(
      '{"mcpServers": {"s": {"command": "npx", "args": ["-y", "@scope/x@1.2.3", "/Users/dev/app"]}}}',
    );
    expect(ids).not.toContain("unpinned-packages");
  });
});
