"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2, Plus } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { BUSINESS_COLORS } from "@/lib/business-visuals";
import { cn } from "@/lib/utils";
import type { ActivityCategoryDTO } from "@/lib/time-tracking-shared";

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

export function CategoryManager({ initialItems }: { initialItems: ActivityCategoryDTO[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(BUSINESS_COLORS[0]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const originalIds = useRef(new Set(initialItems.map((i) => i.id)));
  const isSaving = useRef(false);

  const active = items.filter((i) => i.active);
  const inactive = items.filter((i) => !i.active);

  function handleEditName(id: string, value: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name: value } : i)));
  }

  function handleEditColor(id: string, color: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, color } : i)));
  }

  function toggleActive(id: string, nextActive: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, active: nextActive } : i)));
  }

  function handleAdd() {
    if (!newName.trim()) return;
    setItems((prev) => [
      ...prev,
      { id: `new-${crypto.randomUUID()}`, name: newName.trim(), color: newColor, active: true },
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
            return await api.post<ActivityCategoryDTO>("/api/activity-categories", {
              name: item.name,
              color: item.color,
            });
          }

          await api.patch(`/api/activity-categories/${item.id}`, {
            name: item.name,
            color: item.color,
            active: item.active,
          });
          return item;
        }),
      );

      await Promise.all(removedIds.map((id) => api.delete(`/api/activity-categories/${id}`)));

      setItems(savedItems);
      originalIds.current = new Set(savedItems.map((i) => i.id));
      setSaveState("saved");
      router.refresh();
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      setSaveState("error");
      setError(errorMessage(e));
    } finally {
      isSaving.current = false;
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {active.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhuma categoria cadastrada.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {active.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
            >
              <div className="flex shrink-0 gap-1">
                {BUSINESS_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleEditColor(item.id, color)}
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
                onChange={(e) => handleEditName(item.id, e.target.value)}
                className="flex-1 bg-transparent text-sm text-text-primary outline-none"
              />
              <button
                type="button"
                onClick={() => toggleActive(item.id, false)}
                className="shrink-0 text-text-secondary hover:text-red-600"
                title="Desativar categoria"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

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
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nova categoria"
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <Button variant="secondary" onClick={handleAdd}>
          <Plus size={14} />
          Adicionar
        </Button>
      </div>

      {inactive.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="text-xs font-medium text-text-secondary">Desativadas</p>
          {inactive.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 opacity-60"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="flex-1 text-sm text-text-secondary line-through">{item.name}</span>
              <button
                type="button"
                onClick={() => toggleActive(item.id, true)}
                className="text-text-secondary hover:text-accent"
                title="Reativar categoria"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ErrorNote message={error} />

      <Button onClick={handleSave} disabled={saveState === "saving"}>
        {SAVE_LABEL[saveState]}
      </Button>
    </div>
  );
}
