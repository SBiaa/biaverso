"use client";

import { ErrorNote } from "@/components/ui";
import { useOptimisticValue } from "@/hooks/useOptimistic";
import { api } from "@/lib/client-api";
import { ideaStatusLabels } from "@/lib/labels";

const statusOptions = Object.keys(ideaStatusLabels);

export function IdeaStatusToggle({
  ideaId,
  initialStatus,
}: {
  ideaId: string;
  initialStatus: string;
}) {
  const { value: status, error, update } = useOptimisticValue(initialStatus);

  function handleChange(next: string) {
    update(next, () => api.patch(`/api/ideas/${ideaId}`, { status: next }));
  }

  return (
    <div className="flex flex-col items-end gap-1">
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
    >
      {statusOptions.map((s) => (
        <option key={s} value={s}>
          {ideaStatusLabels[s]}
        </option>
      ))}
    </select>
      <ErrorNote message={error} />
    </div>
  );
}
