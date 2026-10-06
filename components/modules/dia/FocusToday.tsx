"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Star } from "lucide-react";
import { Card, CardTitle, ErrorNote } from "@/components/ui";
import { useOptimisticList } from "@/hooks/useOptimistic";
import { api } from "@/lib/client-api";
import { cn, hexToRgba } from "@/lib/utils";
import { MAX_FOCUS, type FocusKind } from "@/lib/day-focus";
import { FocusStar } from "@/components/modules/dia/FocusStar";

export type FocusItem = {
  /** `kind:id` — único entre as três tabelas de tarefa. */
  id: string;
  kind: FocusKind;
  taskId: string;
  title: string;
  done: boolean;
  originLabel: string | null;
  originColor: string | null;
  originHref: string | null;
  /** Só tarefa de coleção precisa do id da coleção na rota. */
  collectionId: string | null;
};

function doneRequest(item: FocusItem, done: boolean) {
  switch (item.kind) {
    case "task":
      return api.patch(`/api/tasks/${item.taskId}`, { done });
    case "production":
      // Produção guarda status; coleção e avulsa guardam um booleano.
      return api.patch(`/api/ace/tasks/${item.taskId}`, {
        status: done ? "CONCLUIDO" : "A_FAZER",
      });
    case "collection":
      return api.patch(`/api/collections/${item.collectionId}/tasks/${item.taskId}`, { done });
  }
}

/**
 * As até três tarefas que ela escolheu como o que importa hoje. Fica logo abaixo
 * do resumo: é a resposta para "se eu só fizer isso, o dia valeu?".
 */
export function FocusToday({ dayId, items: serverItems }: { dayId: string; items: FocusItem[] }) {
  const { items, error, update } = useOptimisticList(serverItems);
  const done = items.filter((i) => i.done).length;

  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <CardTitle className="flex items-center gap-1.5">
          <Star size={16} className="text-amber-500" fill="currentColor" />
          Foco de hoje
        </CardTitle>
        <span className="text-sm text-text-secondary">
          {done} de {items.length || MAX_FOCUS}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Escolha até {MAX_FOCUS} tarefas para o dia: toque na estrelinha ao lado de qualquer
          tarefa, nas listas abaixo.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() =>
                  update(item.id, { done: !item.done }, () => doneRequest(item, !item.done))
                }
                aria-label={item.done ? `Reabrir ${item.title}` : `Concluir ${item.title}`}
                className="shrink-0"
              >
                {item.done ? (
                  <CheckCircle2 size={18} className="text-accent" />
                ) : (
                  <Circle size={18} className="text-text-secondary" />
                )}
              </button>
              <span
                className={cn(
                  "min-w-0 flex-1 text-text-primary",
                  item.done && "text-text-secondary line-through",
                )}
              >
                {item.title}
              </span>
              {item.originLabel && item.originColor && (
                <OriginChip item={item} color={item.originColor} label={item.originLabel} />
              )}
              <FocusStar
                dayId={dayId}
                kind={item.kind}
                taskId={item.taskId}
                focused
                title={item.title}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2">
        <ErrorNote message={error} />
      </div>
    </Card>
  );
}

function OriginChip({ item, color, label }: { item: FocusItem; color: string; label: string }) {
  const className =
    "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium";
  const style = { backgroundColor: hexToRgba(color, 0.12), color };

  return item.originHref ? (
    <Link href={item.originHref} className={cn(className, "hover:underline")} style={style}>
      {label}
    </Link>
  ) : (
    <span className={className} style={style}>
      {label}
    </span>
  );
}
