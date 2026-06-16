import Link from "next/link";

const LearnPage = () => (
  <div className="relative overflow-hidden">
    <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />
    <div className="relative mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
        <span className="label">Learn mode</span>
      </div>
      <h1 className="mt-5 text-4xl font-semibold uppercase tracking-tight sm:text-5xl">
        Coming soon
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
        CTF-style challenges to train your eye for MCP flaws — tool poisoning,
        rug pulls, the lethal trifecta — with progressive hints and detailed
        write-ups.
      </p>
      <Link
        href="/scan"
        className="mt-7 inline-flex items-center gap-2 bg-ink px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-accent"
      >
        Try the scanner <span aria-hidden>→</span>
      </Link>
    </div>
  </div>
);

export default LearnPage;
