"use client";

import { useRef, useState } from "react";
import { RotateCcw, Trash2, Plus } from "lucide-react";
import { Card, Button } from "@/components/ui";

type HabitItem = { id: string; name: string; active: boolean };

export function HabitList({ initialItems }: { initialItems: HabitItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [newName, setNewName] = useState("");
  const timeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const active = items.filter((i) => i.active);
  const inactive = items.filter((i) => !i.active);

  function handleEditName(id: string, value: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name: value } : i)));
    if (timeouts.current[id]) clearTimeout(timeouts.current[id]);
    timeouts.current[id] = setTimeout(() => {
      fetch(`/api/habits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
    }, 600);
  }

  async function toggleActive(id: string, nextActive: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, active: nextActive } : i)));
    await fetch(`/api/habits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: nextActive }),
    });
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    const response = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const created = await response.json();
    setItems((prev) => [...prev, { id: created.id, name: created.name, active: true }]);
    setNewName("");
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-text-primary">
        Hábitos — checklist diário
      </h2>

      {active.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum hábito cadastrado.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {active.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
            >
              <input
                value={item.name}
                onChange={(e) => handleEditName(item.id, e.target.value)}
                className="flex-1 bg-transparent text-sm text-text-primary outline-none"
              />
              <button
                type="button"
                onClick={() => toggleActive(item.id, false)}
                className="text-text-secondary hover:text-red-600"
                title="Desativar hábito"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Novo hábito"
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <Button variant="secondary" onClick={handleAdd}>
          <Plus size={14} />
          Adicionar
        </Button>
      </div>

      {inactive.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="text-xs font-medium text-text-secondary">Desativados</p>
          {inactive.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 opacity-60"
            >
              <span className="flex-1 text-sm text-text-secondary line-through">
                {item.name}
              </span>
              <button
                type="button"
                onClick={() => toggleActive(item.id, true)}
                className="text-text-secondary hover:text-accent"
                title="Reativar hábito"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
