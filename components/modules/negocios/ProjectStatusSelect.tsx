"use client";

import { useState } from "react";
import { ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { projectStatusLabels } from "@/lib/labels";

const statusOptions = Object.keys(projectStatusLabels);

export function ProjectStatusSelect({
  projectId,
  initialStatus,
}: {
  projectId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(value: string) {
    const previous = status;
    setError(null);
    setStatus(value);

    try {
      await api.patch(`/api/projects/${projectId}`, { status: value });
    } catch (e) {
      setStatus(previous);
      setError(errorMessage(e));
    }
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
