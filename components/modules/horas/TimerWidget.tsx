"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Square } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import type { ActivityCategoryDTO, TimeEntryDTO } from "@/lib/time-tracking-shared";

const inputClass =
  "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

export function TimerWidget({
  categories,
  initialRunning,
}: {
  categories: ActivityCategoryDTO[];
  initialRunning: TimeEntryDTO | null;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(initialRunning);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const startedAt = new Date(running.startedAt).getTime();
    const tick = () => setElapsed(Date.now() - startedAt);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running]);

  async function handleStart() {
    if (!categoryId) return;
    setSaving(true);
    setError(null);
    try {
      const entry = await api.post<TimeEntryDTO>("/api/time-entries/start", {
        categoryId,
        title: title.trim() || null,
      });
      setRunning(entry);
      setTitle("");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleStop() {
    if (!running) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/time-entries/${running.id}/stop`, {});
      setRunning(null);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const runningCategory = running
    ? categories.find((c) => c.id === running.categoryId)
    : null;

  if (running) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 shrink-0 animate-pulse rounded-full"
            style={{ backgroundColor: runningCategory?.color ?? "#6366F1" }}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-text-primary">
              {runningCategory?.name ?? "Categoria removida"}
              {running.title ? ` — ${running.title}` : ""}
            </span>
            <span className="font-mono text-2xl font-semibold text-text-primary">
              {formatElapsed(elapsed)}
            </span>
          </div>
          <Button onClick={handleStop} disabled={saving} variant="secondary">
            <Square size={14} />
            Parar
          </Button>
        </div>
        <ErrorNote message={error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {categories.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Crie uma categoria abaixo para poder iniciar o cronômetro.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
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
              placeholder="O que você vai fazer? (opcional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>
          <Button onClick={handleStart} disabled={saving || !categoryId}>
            <Play size={14} />
            Iniciar
          </Button>
          <ErrorNote message={error} />
        </>
      )}
    </div>
  );
}
