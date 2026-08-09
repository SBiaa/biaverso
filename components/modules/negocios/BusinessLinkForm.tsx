"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type BusinessOption = { id: string; name: string };

type BusinessLinkFormProps = {
  clientId: string;
  allBusinesses: BusinessOption[];
  existingBusinessIds: string[];
};

export function BusinessLinkForm({
  clientId,
  allBusinesses,
  existingBusinessIds,
}: BusinessLinkFormProps) {
  const router = useRouter();
  const options = allBusinesses.filter((b) => !existingBusinessIds.includes(b.id));
  const [businessId, setBusinessId] = useState(options[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  if (options.length === 0) return null;

  async function handleSubmit() {
    setSaving(true);
    await fetch(`/api/clients/${clientId}/business-links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <select
        value={businessId}
        onChange={(e) => setBusinessId(e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        {options.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <Button variant="secondary" onClick={handleSubmit} disabled={saving}>
        Vincular a este negócio
      </Button>
    </div>
  );
}
