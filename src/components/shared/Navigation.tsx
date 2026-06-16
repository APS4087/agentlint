import Link from "next/link";

const NavLink = ({
  href,
  children,
  disabled,
}: {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
}) => {
  if (disabled) {
    return (
      <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
        {children}
        <span className="text-[9px]">·soon</span>
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink"
    >
      {children}
    </Link>
  );
};

export const Navigation = () => (
  <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur">
    <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
      <Link href="/" className="group flex items-center gap-2.5">
        <span
          className="h-2.5 w-2.5 rounded-full bg-accent transition-transform group-hover:scale-110"
          aria-hidden
        />
        <span className="text-base font-semibold uppercase tracking-[0.06em]">
          AgentLint
        </span>
      </Link>

      <div className="flex items-center gap-6">
        <NavLink href="/scan">Scan</NavLink>
        <NavLink href="/learn" disabled>
          Learn
        </NavLink>
        <NavLink href="/leaderboard" disabled>
          Board
        </NavLink>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink"
        >
          GitHub
        </a>
      </div>
    </nav>
  </header>
);
