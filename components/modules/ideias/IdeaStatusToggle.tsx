"use client";

import { useState } from "react";
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

  function handleChange(value: string) {
    setStatus(value);
    fetch(`/api/ideas/${ideaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
  }

  return (
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
  );
}
