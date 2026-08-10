"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

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
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) return null;

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    try {
      // Vínculo repetido volta 409 com mensagem pronta do servidor.
      await api.post(`/api/clients/${clientId}/business-links`, { businessId });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
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
      <ErrorNote message={error} />
    </div>
  );
}
