"use client";

import { useState } from "react";
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

  function handleChange(value: string) {
    setStatus(value);
    fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
  }

  return (
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
  );
}
