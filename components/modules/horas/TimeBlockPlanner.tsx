"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import type { ActivityCategoryDTO, TimeBlockDTO } from "@/lib/time-tracking-shared";

const inputClass =
  "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

export function TimeBlockPlanner({
  dayId,
  categories,
  blocks,
}: {
  dayId: string;
  categories: ActivityCategoryDTO[];
  blocks: TimeBlockDTO[];
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  async function handleAdd() {
    if (!categoryId || !startTime || !endTime) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/time-blocks", {
        dayId,
        categoryId,
        title: title.trim() || null,
        startTime,
        endTime,
      });
      setTitle("");
      setStartTime("");
      setEndTime("");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(block: TimeBlockDTO) {
    setDeletingId(block.id);
    setError(null);
    try {
      await api.delete(`/api/time-blocks/${block.id}`);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum bloco planejado para este dia.</p>
      ) : (
        <ul className="divide-y divide-border">
          {blocks.map((block) => {
            const category = categoryById.get(block.categoryId);
            return (
              <li key={block.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-24 shrink-0 text-text-secondary">
                  {block.startTime}–{block.endTime}
                </span>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: category?.color ?? "#6366F1" }}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-text-primary">
                    {category?.name ?? "Categoria removida"}
                  </span>
                  {block.title && (
                    <span className="truncate text-xs text-text-secondary">{block.title}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(block)}
                  disabled={deletingId === block.id}
                  aria-label={`Excluir bloco ${category?.name ?? ""}`}
                  className="shrink-0 rounded p-1 text-text-secondary hover:bg-black/[0.03] disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {categories.length > 0 && (
        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Título (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputClass}
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={inputClass}
          />
          <Button
            className="col-span-2"
            variant="secondary"
            onClick={handleAdd}
            disabled={saving || !startTime || !endTime}
          >
            <Plus size={14} />
            Adicionar bloco
          </Button>
        </div>
      )}

      <ErrorNote message={error} />
    </div>
  );
}
