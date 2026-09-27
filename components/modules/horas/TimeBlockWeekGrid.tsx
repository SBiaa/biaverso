"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button, confirmAction, ErrorNote, IconButton, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { addUtcDays, cn } from "@/lib/utils";
import { WEEKDAY_LABELS, todayIndexInWeek } from "@/lib/cardapio";
import type { ActivityCategoryDTO, TimeBlockDTO } from "@/lib/time-tracking-shared";
import type { WeekDayBlocks } from "@/lib/time-tracking";

const inputClass =
  "w-full rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent";

function emptyForm(categoryId: string) {
  return { categoryId, title: "", startTime: "", endTime: "" };
}

export function TimeBlockWeekGrid({
  weekStart,
  days,
  categories,
}: {
  weekStart: string;
  days: WeekDayBlocks[];
  categories: ActivityCategoryDTO[];
}) {
  const router = useRouter();
  const [openDayId, setOpenDayId] = useState<string | null>(null);
  const [form, setForm] = useState(() => emptyForm(categories[0]?.id ?? ""));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const weekStartDate = new Date(weekStart);
  const todayIndex = todayIndexInWeek(weekStart);

  function openForm(dayId: string) {
    setForm(emptyForm(categories[0]?.id ?? ""));
    setOpenDayId(dayId);
    setError(null);
  }

  async function handleAdd(dayId: string) {
    if (!form.categoryId || !form.startTime || !form.endTime) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/time-blocks", {
        dayId,
        categoryId: form.categoryId,
        title: form.title.trim() || null,
        startTime: form.startTime,
        endTime: form.endTime,
      });
      setOpenDayId(null);
      router.refresh();
      notify("Bloco adicionado.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(block: TimeBlockDTO) {
    const category = categoryById.get(block.categoryId);
    const confirmed = await confirmAction({
      title: `Excluir bloco de ${category?.name ?? "categoria removida"}?`,
      destructive: true,
    });
    if (!confirmed) return;

    setDeletingId(block.id);
    setError(null);
    try {
      await api.delete(`/api/time-blocks/${block.id}`);
      router.refresh();
      notify("Excluído.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <ErrorNote message={error} />
      <div className="grid min-w-[980px] grid-cols-7 gap-2">
        {days.map((day, dayOfWeek) => {
          const isToday = dayOfWeek === todayIndex;
          return (
            <div key={day.dayId} className="flex flex-col gap-2">
              <Link
                href={`/horas?date=${day.date}`}
                className={cn(
                  "text-center text-sm font-semibold hover:underline",
                  isToday ? "text-accent" : "text-text-primary",
                )}
              >
                {WEEKDAY_LABELS[dayOfWeek]}{" "}
                <span className="font-normal">
                  {addUtcDays(weekStartDate, dayOfWeek).getUTCDate()}
                </span>
              </Link>

              <div
                className={cn(
                  "flex min-h-[2.5rem] flex-1 flex-col gap-1.5 rounded-lg border bg-surface p-1.5",
                  isToday ? "border-accent/40" : "border-border",
                )}
              >
                {day.blocks.map((block) => {
                  const category = categoryById.get(block.categoryId);
                  return (
                    <div
                      key={block.id}
                      className="group flex items-start gap-1.5 rounded-md border border-border px-1.5 py-1"
                    >
                      <span
                        className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: category?.color ?? "#6366F1" }}
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[10px] text-text-secondary">
                          {block.startTime}–{block.endTime}
                        </span>
                        <span className="truncate text-xs text-text-primary">
                          {category?.name ?? "Categoria removida"}
                        </span>
                      </div>
                      <IconButton
                        onClick={() => handleDelete(block)}
                        disabled={deletingId === block.id}
                        aria-label={`Excluir bloco ${category?.name ?? ""}`}
                        tone="danger"
                        revealOnHover
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  );
                })}

                {openDayId === day.dayId ? (
                  <div className="flex flex-col gap-1.5 rounded-md border border-border p-1.5">
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
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
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      className={inputClass}
                    />
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                      className={inputClass}
                    />
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                      className={inputClass}
                    />
                    <div className="flex gap-1">
                      <Button
                        className="flex-1 px-2 py-1 text-xs"
                        onClick={() => handleAdd(day.dayId)}
                        disabled={saving || !form.startTime || !form.endTime}
                      >
                        Salvar
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        onClick={() => setOpenDayId(null)}
                      >
                        X
                      </Button>
                    </div>
                  </div>
                ) : (
                  categories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => openForm(day.dayId)}
                      className="flex items-center justify-center gap-1 rounded-md border border-dashed border-border py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent"
                    >
                      <Plus size={12} />
                      Adicionar
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
