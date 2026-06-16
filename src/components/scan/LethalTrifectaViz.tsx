import type { TrifectaState } from "@/lib/scanner/types";

const Axis = ({
  active,
  title,
  contributors,
}: {
  active: boolean;
  title: string;
  contributors: string[];
}) => (
  <div
    className="flex-1 border p-3"
    style={{
      borderColor: active ? "var(--color-ink)" : "var(--color-line)",
      backgroundColor: active ? "var(--color-ink)" : "var(--color-surface)",
      color: active ? "var(--color-paper)" : "var(--color-ink-faint)",
    }}
  >
    <div className="flex items-center gap-2">
      <span
        className="h-2 w-2 rounded-full"
        style={{
          backgroundColor: active ? "var(--color-accent)" : "transparent",
          boxShadow: active ? "none" : "inset 0 0 0 1px var(--color-line)",
        }}
        aria-hidden
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
        {title}
      </span>
    </div>
    {active && contributors.length > 0 && (
      <div className="mt-2 font-mono text-[10px] leading-tight opacity-70">
        {contributors.join(", ")}
      </div>
    )}
  </div>
);

export const LethalTrifectaViz = ({
  trifecta,
}: {
  trifecta: TrifectaState;
}) => {
  const count = [
    trifecta.dataAccess,
    trifecta.untrustedContent,
    trifecta.externalComms,
  ].filter(Boolean).length;

  const complete = count === 3;
  const status = complete
    ? "Complete — exfiltration path exists"
    : "Two of three — one capability from critical";

  return (
    <div className="border border-line bg-surface">
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          backgroundColor: complete ? "var(--color-accent)" : "var(--color-ink)",
          color: "var(--color-paper)",
        }}
      >
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em]">
          Lethal Trifecta
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] opacity-90">
          {status}
        </span>
      </div>

      <div className="flex items-stretch gap-2 p-4">
        <Axis
          active={trifecta.dataAccess}
          title="Private data"
          contributors={trifecta.contributors.dataAccess}
        />
        <div
          className="flex items-center font-mono text-sm text-ink-faint"
          aria-hidden
        >
          +
        </div>
        <Axis
          active={trifecta.untrustedContent}
          title="Untrusted content"
          contributors={trifecta.contributors.untrustedContent}
        />
        <div
          className="flex items-center font-mono text-sm text-ink-faint"
          aria-hidden
        >
          +
        </div>
        <Axis
          active={trifecta.externalComms}
          title="External comms"
          contributors={trifecta.contributors.externalComms}
        />
      </div>
    </div>
  );
};
