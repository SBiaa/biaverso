"use client";

import { useRef, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardTitle,
  ErrorNote,
  IconButton,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

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
  const [error, setError] = useState<string | null>(null);
  const originalIds = useRef(new Set(initialItems.map((i) => i.id)));
  const isSaving = useRef(false);

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
    if (isSaving.current) return;
    isSaving.current = true;
    setSaveState("saving");
    setError(null);
    try {
      const removedIds = [...originalIds.current].filter(
        (id) => !items.some((i) => i.id === id),
      );

      const savedItems = await Promise.all(
        items.map(async (item) => {
          if (isNewId(item.id)) {
            return await api.post<HabitItem>("/api/habits", { name: item.name });
          }

          await api.patch(`/api/habits/${item.id}`, {
            name: item.name,
            active: item.active,
          });
          return item;
        }),
      );

      await Promise.all(removedIds.map((id) => api.delete(`/api/habits/${id}`)));

      setItems(savedItems);
      originalIds.current = new Set(savedItems.map((i) => i.id));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      setSaveState("error");
      setError(errorMessage(e));
    } finally {
      isSaving.current = false;
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>
        Hábitos — checklist diário
      </CardTitle>

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
              <IconButton
                onClick={() => toggleActive(item.id, false)}
                title="Desativar hábito"
                tone="danger"
              >
                <Trash2 size={15} />
              </IconButton>
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
              <IconButton
                onClick={() => toggleActive(item.id, true)}
                title="Reativar hábito"
                className="hover:text-accent"
              >
                <RotateCcw size={15} />
              </IconButton>
            </div>
          ))}
        </div>
      )}

      <ErrorNote message={error} />

      <Button onClick={handleSave} disabled={saveState === "saving"}>
        {SAVE_LABEL[saveState]}
      </Button>
    </Card>
  );
}
