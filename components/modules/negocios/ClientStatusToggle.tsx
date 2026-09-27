"use client";

import { ErrorNote } from "@/components/ui";
import { useOptimisticValue } from "@/hooks/useOptimistic";
import { api } from "@/lib/client-api";
import { clientStatusLabels } from "@/lib/labels";

const statusOptions = Object.keys(clientStatusLabels);

type ClientStatusToggleProps = {
  linkId: string;
  initialStatus: string;
};

export function ClientStatusToggle({
  linkId,
  initialStatus,
}: ClientStatusToggleProps) {
  const { value: status, error, update } = useOptimisticValue(initialStatus);

  function handleChange(next: string) {
    update(next, () => api.patch(`/api/client-business/${linkId}`, { status: next }));
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
          {clientStatusLabels[s]}
        </option>
      ))}
    </select>
      <ErrorNote message={error} />
    </div>
  );
}
