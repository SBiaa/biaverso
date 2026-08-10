"use client";

import { useState } from "react";
import { ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { ideaStatusLabels } from "@/lib/labels";

const statusOptions = Object.keys(ideaStatusLabels);

export function IdeaStatusToggle({
  ideaId,
  initialStatus,
}: {
  ideaId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(value: string) {
    const previous = status;
    setError(null);
    setStatus(value);

    try {
      await api.patch(`/api/ideas/${ideaId}`, { status: value });
    } catch (e) {
      setStatus(previous);
      setError(errorMessage(e));
    }
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
