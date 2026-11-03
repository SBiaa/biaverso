"use client";

import { useState } from "react";
import { cn, hexToRgba, toDateInputValue } from "@/lib/utils";
import type { WorkTask } from "./WorkTasksToday";
import { formatMinutes, parseMinutes, type PriorityLevelDTO } from "@/lib/task-plan";

/**
 * Campos editáveis de uma tarefa de trabalho. Moram aqui porque aparecem em
 * dois lugares: na linha da tabela e no painel lateral da tarefa.
 */

export function EstimateInput({
  minutes,
  disabled,
  onCommit,
}: {
  minutes: number | null;
  disabled: boolean;
  onCommit: (value: number | null) => void;
}) {
  const [text, setText] = useState(minutes === null ? "" : formatMinutes(minutes));
  const [invalid, setInvalid] = useState(false);

  function commit() {
    const parsed = parseMinutes(text);
    if (parsed === undefined) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setText(parsed === null ? "" : formatMinutes(parsed));
    if (parsed !== minutes) onCommit(parsed);
  }

  return (
    <input
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        setInvalid(false);
      }}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      disabled={disabled}
      placeholder="—"
      aria-label="Tempo estimado"
      aria-invalid={invalid}
      title='Ex.: 45, 1h30, 2h'
      className={cn(
        "w-16 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-text-primary outline-none placeholder:text-text-secondary/60 hover:border-border focus:border-border focus:ring-2 focus:ring-accent disabled:opacity-50",
        invalid && "border-red-500",
      )}
    />
  );
}

/** Data editável direto na linha: clicar abre o calendário do navegador. */
export function DateInput({
  value,
  label,
  late,
  onCommit,
}: {
  value: string | null;
  label: string;
  late: boolean;
  onCommit: (value: string | null) => void;
}) {
  const current = value ? toDateInputValue(value) : "";

  return (
    <input
      type="date"
      // Remonta quando o valor muda por fora (gravou, ou voltou por erro).
      key={current}
      defaultValue={current}
      onBlur={(e) => {
        const value = e.currentTarget.value;
        if (value !== current) onCommit(value || null);
      }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      aria-label={label}
      title="Clique para mudar a data"
      className={cn(
        "w-[8.5rem] cursor-pointer rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none hover:border-border focus:border-border focus:ring-2 focus:ring-accent",
        late
          ? "font-medium text-red-600"
          : current
            ? "text-text-secondary"
            : "text-text-secondary/60",
      )}
    />
  );
}

export function PrioritySelect({
  task,
  levels,
  onChange,
}: {
  task: WorkTask;
  levels: PriorityLevelDTO[];
  onChange: (id: string | null) => void;
}) {
  const level = levels.find((l) => l.id === task.priorityLevelId);

  return (
    <select
      value={task.priorityLevelId ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={task.done}
      aria-label="Prioridade"
      className="max-w-[7rem] cursor-pointer rounded-full border border-transparent py-0.5 pl-2 pr-1 text-xs font-medium outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
      style={
        level
          ? { backgroundColor: hexToRgba(level.color, 0.14), color: level.color }
          : undefined
      }
    >
      <option value="">Sem prioridade</option>
      {levels.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </select>
  );
}
