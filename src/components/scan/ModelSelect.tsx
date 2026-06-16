"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { ModelOption } from "@/lib/ai/providers";

const CUSTOM = "__custom__";

/**
 * On-brand model picker. A native <select> can't render the model id next to a
 * label or match the monochrome aesthetic, so this is a custom listbox: a
 * spec-sheet row per model (name + exact id), a signature accent dot on the
 * selected row, and full keyboard support. A trailing "Custom model id…" row
 * preserves the type-anything escape hatch.
 */
export const ModelSelect = ({
  options,
  value,
  isCustom,
  onSelect,
  onSelectCustom,
}: {
  options: ModelOption[];
  /** Current model id (may be a hand-typed value when isCustom). */
  value: string;
  isCustom: boolean;
  onSelect: (id: string) => void;
  onSelectCustom: () => void;
}) => {
  const items = [...options, { id: CUSTOM, label: "Custom model id…" }];
  const selectedIndex = isCustom
    ? items.length - 1
    : Math.max(
        0,
        items.findIndex((o) => o.id === value),
      );

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  // Reset the active row to the current selection each time the list opens.
  useEffect(() => {
    if (open) setActive(selectedIndex);
    // selectedIndex intentionally omitted: only re-sync on open/close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Keep the keyboard-active row in view.
  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${baseId}-opt-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open, baseId]);

  const choose = (i: number) => {
    const it = items[i];
    if (it.id === CUSTOM) onSelectCustom();
    else onSelect(it.id);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(items.length - 1, a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(items.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const selected = items[selectedIndex];
  const triggerLabel = selected?.label ?? value;

  return (
    <div ref={rootRef} className="relative mt-1.5">
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-controls={`${baseId}-listbox`}
        aria-expanded={open}
        aria-activedescendant={open ? `${baseId}-opt-${active}` : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className="flex w-full items-center justify-between gap-2 border border-line bg-surface px-3 py-2 text-left font-mono text-sm text-ink outline-none focus:border-ink"
        style={open ? { borderColor: "var(--color-ink)" } : undefined}
      >
        <span className="truncate">{triggerLabel}</span>
        <span
          className="shrink-0 text-ink-faint transition-transform duration-150"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <ul
          id={`${baseId}-listbox`}
          role="listbox"
          aria-label="Model"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto border border-ink bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          {items.map((it, i) => {
            const isSelected = i === selectedIndex;
            const isActive = i === active;
            const isCustomRow = it.id === CUSTOM;
            return (
              <li
                key={it.id}
                id={`${baseId}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 ${
                  isActive ? "bg-line/50" : "bg-surface"
                } ${isCustomRow ? "border-t border-line" : ""}`}
              >
                {/* signature accent dot marks the current selection */}
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: isSelected
                      ? "var(--color-accent)"
                      : "transparent",
                  }}
                  aria-hidden
                />
                <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                  <span
                    className={`truncate text-sm ${
                      isSelected || isActive ? "text-ink" : "text-ink-soft"
                    }`}
                  >
                    {it.label}
                  </span>
                  {!isCustomRow && (
                    <span className="shrink-0 font-mono text-[10px] text-ink-faint">
                      {it.id}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
