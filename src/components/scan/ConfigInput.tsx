"use client";

import { useMemo } from "react";

import { EXAMPLE_CONFIGS } from "@/lib/scanner/examples";
import type { ConfigFormat } from "@/lib/scanner/types";

export type FormatHint = ConfigFormat | "auto";

const FORMAT_OPTIONS: { value: FormatHint; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: "claude-desktop", label: "Claude / Cursor" },
  { value: "vscode", label: "VS Code" },
];

const PLACEHOLDER = `{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem@2025.4.1", "/path/to/project"]
    }
  }
}`;

const detectFormat = (text: string): string | null => {
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === "object") {
      if ("mcpServers" in obj) return "mcpServers · claude / cursor";
      if ("servers" in obj) return "servers · vs code";
    }
    return null;
  } catch {
    return null;
  }
};

export const ConfigInput = ({
  value,
  onChange,
  format,
  onFormatChange,
  onScan,
  onLoadExample,
  loading,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  format: FormatHint;
  onFormatChange: (f: FormatHint) => void;
  onScan: () => void;
  onLoadExample: (json: string) => void;
  loading: boolean;
  error: string | null;
}) => {
  const jsonState = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return { valid: null as boolean | null, detected: null };
    try {
      JSON.parse(trimmed);
      return { valid: true, detected: detectFormat(trimmed) };
    } catch {
      return { valid: false, detected: null };
    }
  }, [value]);

  const invalid = jsonState.valid === false;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label self-center">Examples</span>
          {EXAMPLE_CONFIGS.map((ex) => (
            <button
              key={ex.id}
              type="button"
              title={ex.blurb}
              onClick={() => onLoadExample(ex.json)}
              className="border border-line bg-surface px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              {ex.label.replace(" config", "")}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 label">
          Format
          <select
            value={format}
            onChange={(e) => onFormatChange(e.target.value as FormatHint)}
            className="border border-line bg-surface px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ink outline-none focus:border-ink"
          >
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Editor */}
      <div
        className="border bg-surface"
        style={{
          borderColor: invalid ? "var(--color-accent)" : "var(--color-line)",
        }}
      >
        <div className="flex items-center justify-between border-b border-line-soft px-3 py-1.5">
          <span className="label">config.json</span>
          {jsonState.valid !== null && (
            <span
              className="font-mono text-[10px] uppercase tracking-[0.12em]"
              style={{
                color: jsonState.valid
                  ? "var(--color-ink)"
                  : "var(--color-accent)",
              }}
            >
              {jsonState.valid ? "● valid" : "✕ invalid"}
            </span>
          )}
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          rows={15}
          aria-label="MCP config JSON"
          aria-invalid={invalid}
          className="w-full resize-y bg-surface p-4 font-mono text-sm leading-relaxed text-ink outline-none placeholder:text-ink-faint"
        />
      </div>

      {jsonState.detected && (
        <p className="label">
          Detected ·{" "}
          <span className="text-ink">{jsonState.detected}</span>
        </p>
      )}

      {(invalid || error) && (
        <p
          className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent"
          role="alert"
        >
          {invalid ? "Input is not valid JSON" : error}
        </p>
      )}

      <button
        type="button"
        onClick={onScan}
        disabled={loading || !value.trim() || invalid}
        className="group inline-flex items-center gap-3 bg-ink px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-ink-faint"
      >
        {loading ? (
          <>
            <span className="dot-pulse inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-paper" />
              <span className="h-1.5 w-1.5 rounded-full bg-paper" />
              <span className="h-1.5 w-1.5 rounded-full bg-paper" />
              <span className="h-1.5 w-1.5 rounded-full bg-paper" />
            </span>
            Scanning
          </>
        ) : (
          <>
            Run scan
            <span aria-hidden>→</span>
          </>
        )}
      </button>
    </div>
  );
};
