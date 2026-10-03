"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button, Card, CardTitle, ErrorNote, IconButton } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { BUSINESS_COLORS } from "@/lib/business-visuals";
import { cn } from "@/lib/utils";
import type { PriorityLevelDTO } from "@/lib/task-plan";

/**
 * Lista de prioridades das tarefas, no estilo das opções de um campo do
 * Notion: cada mudança grava na hora, e a ordem da lista é a ordem de urgência
 * (a de cima aparece primeiro na tabela do dia).
 */
export function PriorityLevelList({ initialItems }: { initialItems: PriorityLevelDTO[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(BUSINESS_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, rollback: PriorityLevelDTO[]) {
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (e) {
      setItems(rollback);
      setError(errorMessage(e));
    }
  }

  function edit(id: string, change: Partial<PriorityLevelDTO>, persist: boolean) {
    const previous = items;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...change } : i)));
    if (persist) run(() => api.patch(`/api/priority-levels/${id}`, change), previous);
  }

  function commitName(id: string) {
    const item = items.find((i) => i.id === id);
    // Nome vazio não grava: volta para o que estava na tela ao carregar.
    if (!item || !item.name.trim()) {
      const original = initialItems.find((i) => i.id === id);
      if (original) edit(id, { name: original.name }, false);
      return;
    }
    edit(id, { name: item.name.trim() }, true);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const previous = items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    const reordered = next.map((item, order) => ({ ...item, order }));
    setItems(reordered);

    run(
      () =>
        Promise.all(
          reordered
            .filter((item, i) => item.id !== previous[i].id)
            .map((item) => api.patch(`/api/priority-levels/${item.id}`, { order: item.order })),
        ),
      previous,
    );
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;

    setError(null);
    try {
      const created = await api.post<PriorityLevelDTO>("/api/priority-levels", {
        name,
        color: newColor,
      });
      setItems((prev) => [...prev, created]);
      setNewName("");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  function remove(id: string) {
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    run(() => api.delete(`/api/priority-levels/${id}`), previous);
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <CardTitle>Prioridades das tarefas</CardTitle>
        <p className="text-sm text-text-secondary">
          A de cima é a mais urgente e aparece primeiro na tabela do dia a dia.
          Apagar uma prioridade não apaga tarefa: ela só fica sem prioridade.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
          >
            <div className="flex shrink-0 gap-1">
              {BUSINESS_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => edit(item.id, { color }, true)}
                  aria-label={`Cor ${color}`}
                  className={cn(
                    "h-4 w-4 rounded-full",
                    item.color === color && "ring-2 ring-offset-1 ring-accent",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input
              value={item.name}
              onChange={(e) => edit(item.id, { name: e.target.value }, false)}
              onBlur={() => commitName(item.id)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              aria-label="Nome da prioridade"
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none"
            />
            <IconButton
              onClick={() => move(index, -1)}
              disabled={index === 0}
              title="Mais urgente"
              aria-label={`Subir ${item.name}`}
            >
              <ArrowUp size={15} />
            </IconButton>
            <IconButton
              onClick={() => move(index, 1)}
              disabled={index === items.length - 1}
              title="Menos urgente"
              aria-label={`Descer ${item.name}`}
            >
              <ArrowDown size={15} />
            </IconButton>
            <IconButton
              onClick={() => remove(item.id)}
              title="Apagar prioridade"
              aria-label={`Apagar ${item.name}`}
              tone="danger"
            >
              <Trash2 size={15} />
            </IconButton>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-t border-border pt-3">
        {BUSINESS_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setNewColor(color)}
            aria-label={`Cor ${color}`}
            className={cn(
              "h-5 w-5 rounded-full",
              newColor === color && "ring-2 ring-offset-1 ring-accent",
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nova prioridade"
          className="min-w-0 flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <Button variant="secondary" onClick={add} disabled={!newName.trim()}>
          <Plus size={14} />
          Adicionar
        </Button>
      </div>

      <ErrorNote message={error} />
    </Card>
  );
}
