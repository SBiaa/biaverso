"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button, confirmAction, ErrorNote, IconButton, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatDurationMinutes } from "@/lib/utils";
import {
  formatInstantTime,
  minutesBetween,
  type ActivityCategoryDTO,
  type TimeEntryDTO,
} from "@/lib/time-tracking-shared";

const inputClass =
  "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

export function TimeEntryList({
  dayId,
  categories,
  entries,
}: {
  dayId: string;
  categories: ActivityCategoryDTO[];
  entries: TimeEntryDTO[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  // O registro em andamento aparece no cronômetro, não duplicado aqui.
  const finished = entries.filter((e) => e.endedAt);

  async function handleAdd() {
    if (!categoryId || !startTime || !endTime) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/time-entries", {
        dayId,
        categoryId,
        title: title.trim() || null,
        startTime,
        endTime,
      });
      setTitle("");
      setStartTime("");
      setEndTime("");
      setShowForm(false);
      router.refresh();
      notify("Registrado.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: TimeEntryDTO) {
    const category = categoryById.get(entry.categoryId);
    const confirmed = await confirmAction({
      title: `Excluir registro de ${category?.name ?? "categoria removida"}?`,
      destructive: true,
    });
    if (!confirmed) return;

    setDeletingId(entry.id);
    setError(null);
    try {
      await api.delete(`/api/time-entries/${entry.id}`);
      router.refresh();
      notify("Excluído.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {finished.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum registro concluído neste dia.</p>
      ) : (
        <ul className="divide-y divide-border">
          {finished.map((entry) => {
            const category = categoryById.get(entry.categoryId);
            return (
              <li key={entry.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-24 shrink-0 text-text-secondary">
                  {formatInstantTime(entry.startedAt)}–{formatInstantTime(entry.endedAt!)}
                </span>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: category?.color ?? "#6366F1" }}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-text-primary">
                    {category?.name ?? "Categoria removida"}
                  </span>
                  {entry.title && (
                    <span className="truncate text-xs text-text-secondary">{entry.title}</span>
                  )}
                </div>
                <span className="shrink-0 text-xs font-medium text-text-secondary">
                  {formatDurationMinutes(minutesBetween(entry.startedAt, entry.endedAt))}
                </span>
                <IconButton
                  onClick={() => handleDelete(entry)}
                  disabled={deletingId === entry.id}
                  aria-label={`Excluir registro ${category?.name ?? ""}`}
                  tone="danger"
                >
                  <Trash2 size={15} />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}

      {categories.length > 0 &&
        (showForm ? (
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
            <div className="col-span-2 flex gap-2">
              <Button onClick={handleAdd} disabled={saving || !startTime || !endTime}>
                Salvar
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setShowForm(true)}>
            <Plus size={14} />
            Registrar tempo manualmente
          </Button>
        ))}

      <ErrorNote message={error} />
    </div>
  );
}
