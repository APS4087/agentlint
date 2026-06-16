"use client";

import { useState } from "react";

import { OWASPBadge } from "@/components/shared/OWASPBadge";
import {
  SEVERITY_META,
  SeverityIndicator,
} from "@/components/shared/SeverityIndicator";
import type { Finding } from "@/lib/scanner/types";

export const FindingCard = ({ finding }: { finding: Finding }) => {
  const [open, setOpen] = useState(false);
  const accent = SEVERITY_META[finding.severity].color;

  return (
    <div className="border border-line bg-surface">
      {/* Accent tick — a short bar in the severity color */}
      <div className="h-[3px]" style={{ backgroundColor: accent }} />

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <SeverityIndicator severity={finding.severity} />
            <span
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint"
              title="Server"
            >
              {finding.server}
            </span>
          </div>
          <OWASPBadge categoryId={finding.owaspCategory} />
        </div>

        <h3 className="mt-3 text-base font-medium leading-snug text-ink">
          {finding.title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          {finding.description}
        </p>

        <div className="mt-4">
          <span className="label">Evidence</span>
          <pre className="mt-1.5 overflow-x-auto border border-line-soft bg-paper px-3 py-2 font-mono text-xs leading-relaxed text-ink">
            <code>{finding.evidence}</code>
          </pre>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink transition-colors hover:text-accent"
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-accent transition-transform"
            style={{ transform: open ? "scale(1.4)" : "scale(1)" }}
            aria-hidden
          />
          {open ? "Hide fix" : "Show fix"}
        </button>

        {open && (
          <div className="mt-3 border-l-2 border-ink bg-paper px-4 py-3 text-sm leading-relaxed text-ink-soft">
            {finding.remediation}
          </div>
        )}
      </div>
    </div>
  );
};
