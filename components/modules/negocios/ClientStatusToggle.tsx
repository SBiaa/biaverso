"use client";

import { useState } from "react";
import { ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
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
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(value: string) {
    const previous = status;
    setError(null);
    setStatus(value);

    try {
      await api.patch(`/api/client-business/${linkId}`, { status: value });
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
          {clientStatusLabels[s]}
        </option>
      ))}
    </select>
      <ErrorNote message={error} />
    </div>
  );
}
