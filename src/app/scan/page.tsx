"use client";

import { useState } from "react";

import { AIBriefing } from "@/components/scan/AIBriefing";
import { ConfigInput, type FormatHint } from "@/components/scan/ConfigInput";
import { ScanReport } from "@/components/scan/ScanReport";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { isParseError, scanConfig } from "@/lib/scanner";
import type { ScanResult } from "@/lib/scanner/types";

const ScanPage = () => {
  const [config, setConfig] = useState("");
  const [format, setFormat] = useState<FormatHint>("auto");
  const [result, setResult] = useState<ScanResult | null>(null);
  // Increments per scan so the AI briefing resets cleanly each time.
  const [scanId, setScanId] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Scanning is pure, deterministic, and runs entirely in the browser —
  // no network, no server, nothing leaves the page.
  const handleScan = () => {
    setError(null);
    try {
      const r = scanConfig(config, format);
      setResult(r);
      setScanId((n) => n + 1);
    } catch (err) {
      setResult(null);
      setError(
        isParseError(err) ? err.message : "Could not scan this config.",
      );
    }
  };

  const handleLoadExample = (json: string) => {
    setConfig(json);
    setResult(null);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-8 border-b border-line pb-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          <span className="label">Scanner</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold uppercase tracking-tight sm:text-4xl">
          Scan an MCP config
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Runs entirely in your browser. Your config is parsed and rule-checked
          locally — never executed, never sent to a server, never stored.
        </p>
      </header>

      <ConfigInput
        value={config}
        onChange={setConfig}
        format={format}
        onFormatChange={setFormat}
        onScan={handleScan}
        onLoadExample={handleLoadExample}
        loading={false}
        error={error}
      />

      {result && (
        <div className="mt-12 space-y-4">
          <ErrorBoundary>
            <AIBriefing key={scanId} result={result} />
          </ErrorBoundary>
          <ScanReport result={result} />
        </div>
      )}
    </div>
  );
};

export default ScanPage;
