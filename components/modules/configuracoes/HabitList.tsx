"use client";

import { useRef, useState } from "react";
import { RotateCcw, Trash2, Plus } from "lucide-react";
import { Card, Button } from "@/components/ui";

type HabitItem = { id: string; name: string; active: boolean };
type SaveState = "idle" | "saving" | "saved" | "error";

function isNewId(id: string) {
  return id.startsWith("new-");
}

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "Salvar",
  saving: "Salvando...",
  saved: "Salvo!",
  error: "Erro ao salvar",
};

export function HabitList({ initialItems }: { initialItems: HabitItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [newName, setNewName] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const originalIds = useRef(new Set(initialItems.map((i) => i.id)));

  const active = items.filter((i) => i.active);
  const inactive = items.filter((i) => !i.active);

  function handleEditName(id: string, value: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name: value } : i)));
  }

  function toggleActive(id: string, nextActive: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, active: nextActive } : i)));
  }

  function handleAdd() {
    if (!newName.trim()) return;
    setItems((prev) => [
      ...prev,
      { id: `new-${crypto.randomUUID()}`, name: newName.trim(), active: true },
    ]);
    setNewName("");
  }

  async function handleSave() {
    setSaveState("saving");
    try {
      const removedIds = [...originalIds.current].filter(
        (id) => !items.some((i) => i.id === id),
      );

      const savedItems = await Promise.all(
        items.map(async (item) => {
          if (isNewId(item.id)) {
            const response = await fetch("/api/habits", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: item.name }),
            });
            if (!response.ok) throw new Error("Falha ao criar hábito");
            const created = await response.json();
            return { id: created.id, name: created.name, active: created.active };
          }

          const response = await fetch(`/api/habits/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: item.name, active: item.active }),
          });
          if (!response.ok) throw new Error("Falha ao atualizar hábito");
          return item;
        }),
      );

      await Promise.all(
        removedIds.map((id) => fetch(`/api/habits/${id}`, { method: "DELETE" })),
      );

      setItems(savedItems);
      originalIds.current = new Set(savedItems.map((i) => i.id));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
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

      <Button onClick={handleSave} disabled={saveState === "saving"}>
        {SAVE_LABEL[saveState]}
      </Button>
    </Card>
  );
}
