"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AISettingsForm } from "@/components/scan/AISettingsForm";
import { analyze, AIRequestError, PROVIDERS } from "@/lib/ai/providers";
import { buildUserContent, SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { useAISettings } from "@/lib/ai/useAISettings";
import type { ScanResult } from "@/lib/scanner/types";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; summary: string }
  | { kind: "error"; message: string };

// --- light Markdown rendering (bold + bullets) -------------------------------

const renderInline = (text: string, k: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${k}-${i}`} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${k}-${i}`}>{part}</span>
    ),
  );

const renderSummary = (text: string) => {
  const out: React.JSX.Element[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (!bullets.length) return;
    out.push(
      <ul key={`ul-${out.length}`} className="ml-4 list-disc space-y-1">
        {bullets.map((b, i) => (
          <li key={i}>{renderInline(b, `li-${out.length}-${i}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      bullets.push(line.replace(/^[-*]\s+/, ""));
    } else {
      flush();
      out.push(
        <p key={`p-${out.length}`} className="leading-relaxed">
          {renderInline(line, `p-${out.length}`)}
        </p>,
      );
    }
  }
  flush();
  return out;
};

// -----------------------------------------------------------------------------

export const AIBriefing = ({ result }: { result: ScanResult }) => {
  const { settings, hydrated, configured, save, clear } = useAISettings();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    if (!settings) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ kind: "loading" });
    try {
      const summary = await analyze({
        provider: settings.provider,
        apiKey: settings.apiKey,
        model: settings.model,
        baseUrl: settings.baseUrl || undefined,
        system: SYSTEM_PROMPT,
        user: buildUserContent(result),
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setStatus({ kind: "ready", summary });
    } catch (err) {
      if (controller.signal.aborted) return;
      setStatus({
        kind: "error",
        message:
          err instanceof AIRequestError
            ? err.message
            : "Could not reach the provider. Check the model id and base URL.",
      });
    }
  }, [settings, result]);

  // Auto-run when configured and the result (or settings) changes.
  useEffect(() => {
    if (configured && !editing) run();
    return () => abortRef.current?.abort();
  }, [configured, editing, run]);

  // Avoid an SSR/hydration flash before localStorage is read.
  if (!hydrated) {
    return (
      <div className="border border-line bg-surface px-4 py-3">
        <span className="label">AI briefing</span>
      </div>
    );
  }

  // Not connected, or actively editing → show the connect form.
  if (!configured || editing) {
    return (
      <div className="border border-line bg-surface">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          <span className="label">Connect an AI for a risk briefing</span>
        </div>
        <div className="p-4">
          <AISettingsForm
            initial={settings}
            onSave={(s) => {
              save(s);
              setEditing(false);
            }}
            onCancel={editing ? () => setEditing(false) : undefined}
          />
        </div>
      </div>
    );
  }

  if (!settings) return null; // unreachable when configured; satisfies the type narrower
  const meta = PROVIDERS[settings.provider];

  return (
    <div className="border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          <span className="label">AI briefing</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
            {meta.label.split(" ")[0]} · {settings.model}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {status.kind === "loading" ? (
            <span
              className="dot-pulse inline-flex items-center gap-1"
              aria-label="Analyzing"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-ink" />
              <span className="h-1.5 w-1.5 rounded-full bg-ink" />
              <span className="h-1.5 w-1.5 rounded-full bg-ink" />
              <span className="h-1.5 w-1.5 rounded-full bg-ink" />
            </span>
          ) : (
            <button
              type="button"
              onClick={run}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft hover:text-accent"
            >
              Re-run
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft hover:text-ink"
          >
            Change
          </button>
          <button
            type="button"
            onClick={() => {
              clear();
              setStatus({ kind: "idle" });
            }}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint hover:text-accent"
            title="Remove the key from this browser"
          >
            Disconnect
          </button>
        </div>
      </div>

      <div className="p-4 text-sm text-ink-soft">
        {status.kind === "loading" && (
          <p className="text-ink-faint">Analyzing findings in context…</p>
        )}
        {status.kind === "error" && (
          <p className="text-ink-faint" role="alert">
            {status.message} The findings below are unaffected.
          </p>
        )}
        {status.kind === "ready" && (
          <div className="space-y-3">{renderSummary(status.summary)}</div>
        )}
      </div>
    </div>
  );
};
