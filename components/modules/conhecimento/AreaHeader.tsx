"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { confirmAction, ErrorNote, IconButton, InlineEdit, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

export function AreaHeader({
  area,
}: {
  area: { id: string; name: string; emoji: string | null };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setError(null);
    try {
      await api.patch(`/api/study/areas/${area.id}`, body);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      throw e;
    }
  }

  async function handleDelete() {
    const confirmed = await confirmAction({
      title: `Excluir a área "${area.name}"?`,
      description: "Todos os assuntos, cursos e aulas dela serão excluídos.",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/study/areas/${area.id}`);
      notify("Área excluída.");
      router.push("/conhecimento");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <ErrorNote message={error} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xl font-semibold text-text-primary">
          <InlineEdit
            value={area.emoji ?? ""}
            placeholder="🙂"
            ariaLabel="Emoji da área"
            onSave={(emoji) => patch({ emoji })}
            className="w-10 text-center"
          />
          <InlineEdit
            value={area.name}
            ariaLabel="Nome da área"
            onSave={(name) => patch({ name })}
            className="text-xl font-semibold"
          />
        </div>
        <IconButton onClick={handleDelete} aria-label={`Excluir ${area.name}`} tone="danger">
          <Trash2 size={16} />
        </IconButton>
      </div>
    </div>
  );
}
