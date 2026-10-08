"use client";

import { useState } from "react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { productionTypeLabels } from "@/lib/labels";
import { parseMinutes, type PriorityLevelDTO } from "@/lib/task-plan";
import type { WorkTask } from "@/components/modules/dia/WorkTasksToday";

export type BusinessOption = { id: string; name: string; color: string };

const fieldClass =
  "rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

/**
 * Cria uma tarefa de negócio sem sair do dia a dia. O prazo já vem com o dia
 * aberto, que é o que ela quer quase sempre ao criar por aqui.
 */
export function NewWorkTaskForm({
  businesses,
  levels,
  dayDate,
  dayInPast,
  onCreated,
  onCancel,
}: {
  businesses: BusinessOption[];
  levels: PriorityLevelDTO[];
  /** Data do dia aberto (YYYY-MM-DD). */
  dayDate: string;
  dayInPast: boolean;
  onCreated: (task: WorkTask) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [type, setType] = useState("OUTRO");
  const [priorityLevelId, setPriorityLevelId] = useState("");
  const [time, setTime] = useState("");
  const [dueDate, setDueDate] = useState(dayDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !businessId) return;

    const estimateMinutes = parseMinutes(time);
    if (estimateMinutes === undefined) {
      setError("Tempo inválido. Use algo como 45, 1h30 ou 2h.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const task = await api.post<{ id: string }>("/api/ace/tasks", {
        title: title.trim(),
        type,
        businessId,
        priorityLevelId: priorityLevelId || undefined,
        estimateMinutes,
        dueDate: dueDate || null,
      });
      const business = businesses.find((b) => b.id === businessId)!;
      const due = dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null;
      const todayStart = new Date(`${dayDate}T00:00:00.000Z`).getTime();

      onCreated({
        kind: "production",
        id: task.id,
        position: null,
        title: title.trim(),
        done: false,
        doneOnLoad: false,
        originLabel: business.name,
        originColor: business.color,
        originHref: null,
        detail: [productionTypeLabels[type], "Interno"].join(" · "),
        urgent: false,
        priorityLevelId: priorityLevelId || null,
        estimateMinutes,
        dueDate: due ? due.toISOString() : null,
        completedAt: null,
        overdue: due !== null && (dayInPast ? due.getTime() <= todayStart : due.getTime() < todayStart),
        collectionId: null,
        subtasks: [],
      });
    } catch (err) {
      // A tarefa não entra na lista se não foi gravada.
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-3 flex flex-col gap-2 rounded-lg border border-border p-3"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da tarefa"
        aria-label="Título da tarefa"
        className={fieldClass}
      />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <select
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          aria-label="Negócio"
          className={fieldClass}
        >
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Tipo"
          className={fieldClass}
        >
          {Object.entries(productionTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={priorityLevelId}
          onChange={(e) => setPriorityLevelId(e.target.value)}
          aria-label="Prioridade"
          className={fieldClass}
        >
          <option value="">Sem prioridade</option>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <input
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="Tempo (ex.: 45, 1h30)"
          aria-label="Tempo estimado"
          className={fieldClass}
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-label="Prazo"
          className={fieldClass}
        />
      </div>
      <ErrorNote message={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={saving || !title.trim() || !businessId}>
          Salvar
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
