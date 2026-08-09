"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { Card, Button } from "@/components/ui";

type TemplateItem = { id: string; title: string };
type SaveState = "idle" | "saving" | "saved" | "error";

function isNewId(id: string) {
  return id.startsWith("new-");
}

function SortableRow({
  item,
  onEdit,
  onDelete,
}: {
  item: TemplateItem;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-text-secondary"
      >
        <GripVertical size={16} />
      </button>
      <input
        value={item.title}
        onChange={(e) => onEdit(item.id, e.target.value)}
        className="flex-1 bg-transparent text-sm text-text-primary outline-none"
      />
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="text-text-secondary hover:text-red-600"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "Salvar",
  saving: "Salvando...",
  saved: "Salvo!",
  error: "Erro ao salvar",
};

export function RoutineTemplateList({
  type,
  title,
  initialItems,
}: {
  type: "ROTINA_NORMAL" | "ROTINA_FAXINA";
  title: string;
  initialItems: TemplateItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [newTitle, setNewTitle] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const originalIds = useRef(new Set(initialItems.map((i) => i.id)));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleEditTitle(id: string, value: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, title: value } : i)));
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleAdd() {
    if (!newTitle.trim()) return;
    setItems((prev) => [...prev, { id: `new-${crypto.randomUUID()}`, title: newTitle.trim() }]);
    setNewTitle("");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  async function handleSave() {
    setSaveState("saving");
    try {
      const removedIds = [...originalIds.current].filter(
        (id) => !items.some((i) => i.id === id),
      );

      const savedItems = await Promise.all(
        items.map(async (item, index) => {
          if (isNewId(item.id)) {
            const response = await fetch("/api/tasks/routines", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: item.title, type, order: index }),
            });
            if (!response.ok) throw new Error("Falha ao criar item");
            const created = await response.json();
            return { id: created.id, title: created.title };
          }

          const response = await fetch(`/api/tasks/routines/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: item.title, order: index }),
          });
          if (!response.ok) throw new Error("Falha ao atualizar item");
          return item;
        }),
      );

      await Promise.all(
        removedIds.map((id) =>
          fetch(`/api/tasks/routines/${id}`, { method: "DELETE" }),
        ),
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
      <h2 className="text-sm font-semibold text-text-primary">{title}</h2>

      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhuma tarefa cadastrada.</p>
      ) : (
        <DndContext
          id={`routine-templates-${type}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1.5">
              {items.map((item) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  onEdit={handleEditTitle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nova tarefa"
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <Button variant="secondary" onClick={handleAdd}>
          <Plus size={14} />
          Adicionar
        </Button>
      </div>

      <Button onClick={handleSave} disabled={saveState === "saving"}>
        {SAVE_LABEL[saveState]}
      </Button>
    </Card>
  );
}
