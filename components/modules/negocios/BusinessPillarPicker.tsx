"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

/**
 * Escolhe (ou troca) o pilar da Central de Visão direto na página do negócio,
 * sem precisar voltar à lista de negócios e abrir "Editar".
 */
export function BusinessPillarPicker({
  businessId,
  pillarId,
}: {
  businessId: string;
  pillarId: string | null;
}) {
  const router = useRouter();
  const [pillars, setPillars] = useState<{ id: string; name: string }[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ id: string; name: string }[]>("/api/vision/pillars")
      .then((list) => !cancelled && setPillars(list))
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  async function change(next: string) {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/businesses/${businessId}`, { pillarId: next || null });
      notify("Pilar salvo.");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={pillarId ?? ""}
        disabled={saving || pillars === null}
        onChange={(e) => change(e.target.value)}
        aria-label="Pilar da Central de Visão"
        className="w-full max-w-xs rounded-md border border-border bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">{pillars === null ? "Carregando pilares…" : "Escolher pilar…"}</option>
        {pillars?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {pillars?.length === 0 && (
        <p className="text-xs text-text-secondary">
          Você ainda não tem pilares. Crie um na Central de Visão primeiro.
        </p>
      )}
      <ErrorNote message={error} />
    </div>
  );
}
