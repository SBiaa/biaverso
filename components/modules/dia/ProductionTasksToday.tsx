"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { Card, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatDateBR } from "@/lib/utils";
import { SubtaskList, SubtaskToggle, useSubtasks, type SubtaskItem } from "./Subtasks";

type Item = {
  id: string;
  title: string;
  status: string;
  typeLabel: string;
  /** Null = item interno do negócio, sem cliente do outro lado. */
  clientName: string | null;
  urgent: boolean;
  dueDate: string | null;
  overdue: boolean;
  subtasks: SubtaskItem[];
};

function TaskRow({ task, onToggle }: { task: Item; onToggle: (id: string) => void }) {
  const done = task.status === "CONCLUIDO";
  const late = task.overdue && !done;
  const subtasks = useSubtasks({ kind: "production", id: task.id }, task.subtasks);
  // Tarefa já quebrada nasce aberta: o ponto dos passos é ver por onde começar.
  const [open, setOpen] = useState(task.subtasks.length > 0 && !done);

  return (
    <>
      <tr>
        <td className="py-2 pr-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggle(task.id)}
              className="flex min-w-0 items-center gap-2 text-left"
            >
              {done ? (
                <CheckCircle2 size={16} className="shrink-0 text-accent" />
              ) : (
                <Circle size={16} className="shrink-0 text-text-secondary" />
              )}
              {task.urgent && !done && (
                <AlertTriangle size={14} className="shrink-0 text-red-600" />
              )}
              <span
                className={cn("text-text-primary", done && "text-text-secondary line-through")}
              >
                {task.title}
                {task.urgent && <span className="sr-only"> (urgente)</span>}
              </span>
            </button>
            <SubtaskToggle
              open={open}
              onClick={() => setOpen((v) => !v)}
              doneCount={subtasks.doneCount}
              total={subtasks.subtasks.length}
            />
          </div>
        </td>
        <td className="py-2 pr-3 text-text-secondary">{task.typeLabel}</td>
        <td className="py-2 pr-3 text-text-secondary">
          {task.clientName ?? <span className="text-text-secondary/60">Interno</span>}
        </td>
        <td className="py-2 whitespace-nowrap">
          {task.dueDate && (
            <span className={cn("text-text-secondary", late && "font-medium text-red-600")}>
              {formatDateBR(new Date(task.dueDate))}
            </span>
          )}
          {late && (
            <span className="ml-1.5 whitespace-nowrap rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white">
              Atrasado
            </span>
          )}
        </td>
      </tr>
      {open && (
        // `divide-y` do tbody separaria a tarefa dos próprios passos.
        <tr className="border-t-0">
          {/* Os passos ocupam a largura toda: quebrar tarefa é texto corrido,
              não cabe dentro da coluna "Tarefa". */}
          <td colSpan={4} className="pb-3 pl-6">
            <SubtaskList {...subtasks} />
          </td>
        </tr>
      )}
    </>
  );
}

export type ProductionGroup = {
  businessId: string;
  businessName: string;
  businessColor: string;
  tasks: Item[];
};

/**
 * Uma seção por negócio. O nome e a cor do cabeçalho vêm do banco — antes esta
 * lista vinha inteira sob um título fixo "Produção Ace", e tarefa de qualquer
 * outro negócio aparecia como se fosse da Ace.
 */
export function ProductionTasksToday({ groups }: { groups: ProductionGroup[] }) {
  const [state, setState] = useState(groups);
  const [error, setError] = useState<string | null>(null);

  async function toggle(businessId: string, id: string) {
    const group = state.find((g) => g.businessId === businessId);
    const task = group?.tasks.find((t) => t.id === id);
    if (!task) return;

    const previous = state;
    const nextStatus = task.status === "CONCLUIDO" ? "A_FAZER" : "CONCLUIDO";

    setError(null);
    setState((prev) =>
      prev.map((g) =>
        g.businessId === businessId
          ? {
              ...g,
              tasks: g.tasks.map((t) =>
                t.id === id ? { ...t, status: nextStatus } : t,
              ),
            }
          : g,
      ),
    );

    try {
      await api.patch(`/api/ace/tasks/${id}`, { status: nextStatus });
    } catch (e) {
      setState(previous);
      setError(errorMessage(e));
    }
  }

  if (state.length === 0) {
    return (
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Produção</h2>
        <p className="text-sm text-text-secondary">
          Nenhuma tarefa de produção para hoje.
        </p>
      </Card>
    );
  }

  return (
    <>
      {state.map((group) => (
        <Card key={group.businessId}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: group.businessColor }}
            />
            Produção {group.businessName}
          </h2>

          {/* Colunas não cabem numa tela de celular: a tabela rola na horizontal
              em vez de espremer o título até virar duas letras por linha. */}
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[30rem] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-text-secondary">
                  <th scope="col" className="pb-2 pr-3 font-medium">
                    Tarefa
                  </th>
                  <th scope="col" className="pb-2 pr-3 font-medium">
                    Tipo
                  </th>
                  <th scope="col" className="pb-2 pr-3 font-medium">
                    Cliente
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Prazo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={(id) => toggle(group.businessId, id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
      <ErrorNote message={error} />
    </>
  );
}
