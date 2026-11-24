"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
        invalid && "border-danger",
      )}
    />
  );
}

/**
 * Data editável direto na linha: clicar abre o calendário do navegador.
 *
 * Grava sozinha um instante depois de escolher (o calendário do navegador não
 * tira o foco do campo), ao sair do campo, no Enter e também se o painel
 * fechar antes disso — antes a data escolhida se perdia ao fechar o painel.
 */
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
  const [draft, setDraft] = useState(current);
  const [synced, setSynced] = useState(current);
  // Mudou por fora (gravou, ou voltou por erro): o campo acompanha.
  if (synced !== current) {
    setSynced(current);
    setDraft(current);
  }

  const latest = useRef({ draft, current, onCommit });
  useEffect(() => {
    latest.current = { draft, current, onCommit };
  });

  const commit = useCallback(() => {
    const { draft, current, onCommit } = latest.current;
    // Ano ainda sendo digitado (0002, 0020...) não grava.
    if (draft && Number(draft.slice(0, 4)) < 1900) return;
    if (draft !== current) {
      latest.current.current = draft;
      onCommit(draft || null);
    }
  }, []);

  // Escolheu no calendário e ficou parada: grava sem precisar clicar fora.
  useEffect(() => {
    if (draft === current) return;
    const timer = setTimeout(commit, 800);
    return () => clearTimeout(timer);
  }, [draft, current, commit]);

  // O painel fechou com a data ainda pendente: grava assim mesmo.
  useEffect(() => commit, [commit]);

  return (
    <input
      type="date"
      value={draft}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      aria-label={label}
      title="Clique para mudar a data"
      className={cn(
        "w-[8.5rem] cursor-pointer rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none hover:border-border focus:border-border focus:ring-2 focus:ring-accent",
        late
          ? "font-medium text-danger"
          : draft
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
