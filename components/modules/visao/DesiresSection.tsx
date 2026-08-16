"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Button,
  CardTitle,
  ErrorNote,
  IconButton,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { DesireFormModal } from "./DesireFormModal";

type Desire = { id: string; title: string; description: string | null };

export function DesiresSection({
  pillarId,
  initialDesires,
}: {
  pillarId: string;
  initialDesires: Desire[];
}) {
  const [desires, setDesires] = useState(initialDesires);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setDesires(await api.get<Desire[]>(`/api/vision/desires?pillarId=${pillarId}`));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleDelete(id: string) {
    const previous = desires;
    setError(null);
    setDesires((prev) => prev.filter((d) => d.id !== id));

    try {
      await api.delete(`/api/vision/desires/${id}`);
    } catch (e) {
      // Devolve o desejo à lista: some da tela só se saiu mesmo do banco.
      setDesires(previous);
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <CardTitle>Desejos &amp; Intenções</CardTitle>
        <Button variant="secondary" onClick={() => setCreating(true)}>
          <Plus size={14} />
          Novo desejo
        </Button>
      </div>

      <ErrorNote message={error} />

      {desires.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum desejo registrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {desires.map((desire) => (
            <li
              key={desire.id}
              className="group flex items-start justify-between gap-2 rounded-md border border-dashed border-border px-3 py-2"
            >
              <div>
                <p className="text-sm text-text-primary">{desire.title}</p>
                {desire.description && (
                  <p className="text-xs text-text-secondary">{desire.description}</p>
                )}
              </div>
              <IconButton
                onClick={() => handleDelete(desire.id)}
                tone="danger"
                className="opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={15} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <DesireFormModal
          pillarId={pillarId}
          mode="create"
          onClose={() => setCreating(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
