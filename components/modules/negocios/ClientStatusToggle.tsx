"use client";

import { useState } from "react";
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

  function handleChange(value: string) {
    setStatus(value);
    fetch(`/api/client-business/${linkId}`, {
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
          {clientStatusLabels[s]}
        </option>
      ))}
    </select>
  );
}
