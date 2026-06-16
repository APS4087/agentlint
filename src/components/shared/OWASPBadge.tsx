import { getOwaspCategory } from "@/lib/owasp/mappings";

export const OWASPBadge = ({ categoryId }: { categoryId: string }) => {
  const category = getOwaspCategory(categoryId);

  return (
    <span
      title={
        category ? `${category.name} — ${category.description}` : categoryId
      }
      className="inline-flex items-center gap-1.5 border border-line bg-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft"
    >
      <span className="font-bold text-ink">{category?.id ?? categoryId}</span>
      {category && (
        <span className="hidden text-ink-faint sm:inline">{category.name}</span>
      )}
    </span>
  );
};
