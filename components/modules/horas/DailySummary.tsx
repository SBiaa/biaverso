import { formatDurationMinutes } from "@/lib/utils";
import {
  totalMinutesByCategory,
  type ActivityCategoryDTO,
  type TimeEntryDTO,
} from "@/lib/time-tracking-shared";

export function DailySummary({
  categories,
  entries,
}: {
  categories: ActivityCategoryDTO[];
  entries: TimeEntryDTO[];
}) {
  const totals = totalMinutesByCategory(entries);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const rows = [...totals.entries()]
    .map(([categoryId, minutes]) => ({ category: categoryById.get(categoryId), minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  if (rows.length === 0) {
    return <p className="text-sm text-text-secondary">Nenhum tempo registrado ainda hoje.</p>;
  }

  const max = Math.max(...rows.map((r) => r.minutes));

  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ category, minutes }) => (
        <div key={category?.id ?? "sem-categoria"} className="flex items-center gap-2">
          <span className="w-20 shrink-0 truncate text-xs text-text-secondary">
            {category?.name ?? "Removida"}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(minutes / max) * 100}%`,
                backgroundColor: category?.color ?? "#6366F1",
              }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-xs font-medium text-text-secondary">
            {formatDurationMinutes(minutes)}
          </span>
        </div>
      ))}
    </div>
  );
}
