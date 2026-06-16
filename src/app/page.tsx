import Link from "next/link";

import { OWASP_TOP10_LINK } from "@/lib/owasp/mappings";

const STATS: { value: string; label: string }[] = [
  { value: "492", label: "Exposed MCP servers found in the wild" },
  { value: "72.8%", label: "Attack success rate on tested MCP agents" },
  { value: "5/7", label: "Top ClawHub skills found to be malware" },
];

const CHECKS: { name: string; desc: string; asi: string }[] = [
  { name: "Hardcoded secrets", desc: "Keys & tokens in env, headers, args", asi: "ASI03" },
  { name: "Dangerous commands", desc: "Shell wrappers, curl | bash, chaining", asi: "ASI05" },
  { name: "Broad filesystem", desc: "Access granted to / , ~ , system paths", asi: "ASI02" },
  { name: "Missing auth", desc: "Remote servers over plaintext, no token", asi: "ASI03" },
  { name: "Tool poisoning", desc: "Hidden instructions in descriptions", asi: "ASI01" },
  { name: "Lethal trifecta", desc: "Data + untrusted content + external comms", asi: "ASI02" },
  { name: "Supply chain", desc: "Unpinned, unscoped, typosquat-prone pkgs", asi: "ASI04" },
  { name: "Privilege escalation", desc: "sudo, --privileged, docker.sock", asi: "ASI03" },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative py-20 sm:py-28">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
            <span className="label">
              MCP Security Scanner · OWASP Agentic Top 10 (2026)
            </span>
          </div>

          <h1 className="mt-6 max-w-4xl text-5xl font-semibold uppercase leading-[0.95] tracking-tight sm:text-7xl">
            Find the flaws
            <br />
            before they{" "}
            <span className="relative whitespace-nowrap">
              do
              <span className="ml-2 inline-block h-3 w-3 translate-y-[-0.35em] rounded-full bg-accent align-middle" />
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft">
            MCP lets agents run tools, read your files, and reach the internet.
            One bad config — a leaked token, an unpinned package, a poisoned
            tool description — is all an attacker needs. Paste yours and read
            the verdict.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 bg-ink px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-accent"
            >
              Scan a config <span aria-hidden>→</span>
            </Link>
            <span className="inline-flex items-center gap-2 border border-line px-6 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-ink-faint">
              Learn mode · soon
            </span>
          </div>
        </div>
      </section>

      {/* Stats — spec-sheet rows, not cards */}
      <section className="border-b border-line py-12">
        <span className="label">In the field · 2026</span>
        <dl className="mt-5 divide-y divide-line border-y border-line">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex items-baseline justify-between gap-6 py-4"
            >
              <dt className="text-sm text-ink-soft">{stat.label}</dt>
              <dd className="shrink-0 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* What it checks — spec grid */}
      <section className="border-b border-line py-12">
        <span className="label">Ten static rules · zero execution</span>
        <div className="mt-5 grid gap-px border border-line bg-line sm:grid-cols-2">
          {CHECKS.map((c) => (
            <div
              key={c.name}
              className="flex items-start justify-between gap-4 bg-surface p-4 transition-colors hover:bg-paper"
            >
              <div>
                <h3 className="text-sm font-medium text-ink">{c.name}</h3>
                <p className="mt-0.5 text-sm text-ink-soft">{c.desc}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                {c.asi}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-2 py-8">
        <span className="label">AgentLint · static MCP analysis</span>
        <a
          href={OWASP_TOP10_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="label transition-colors hover:text-accent"
        >
          OWASP Agentic Top 10 ↗
        </a>
      </footer>
    </div>
  );
}
