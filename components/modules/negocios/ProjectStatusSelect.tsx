"use client";

import { ErrorNote } from "@/components/ui";
import { useOptimisticValue } from "@/hooks/useOptimistic";
import { api } from "@/lib/client-api";
import { projectStatusLabels } from "@/lib/labels";

const statusOptions = Object.keys(projectStatusLabels);

export function ProjectStatusSelect({
  projectId,
  initialStatus,
}: {
  projectId: string;
  initialStatus: string;
}) {
  const { value: status, error, update } = useOptimisticValue(initialStatus);

  function handleChange(next: string) {
    update(next, () => api.patch(`/api/projects/${projectId}`, { status: next }));
  }

  return (
    <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
    <select
      value={status}
      onChange={(e) => {
        e.stopPropagation();
        handleChange(e.target.value);
      }}
      onClick={(e) => e.stopPropagation()}
      className="rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
    >
      {statusOptions.map((s) => (
        <option key={s} value={s}>
          {projectStatusLabels[s]}
        </option>
      ))}
    </select>
      <ErrorNote message={error} />
    </div>
  );
}
