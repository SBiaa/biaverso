"use client";

import { useState } from "react";
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
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { MoodboardItemModal } from "./MoodboardItemModal";

type MoodboardItem = {
  id: string;
  type: string;
  content: string;
  caption: string | null;
  order: number;
};

function MoodboardCard({
  item,
  color,
  onEdit,
  onDelete,
}: {
  item: MoodboardItem;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
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
      className="group relative w-full max-w-[220px] flex-1 basis-[160px]"
    >
      <div className="absolute right-1.5 top-1.5 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-md bg-black/50 p-1 text-white"
        >
          <GripVertical size={12} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md bg-black/50 p-1 text-white hover:bg-red-600"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {item.type === "IMAGEM" ? (
        <button
          type="button"
          onClick={onEdit}
          className="block aspect-square w-full overflow-hidden rounded-[10px] border border-border bg-border/40"
        >
          {item.content && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.content}
              alt={item.caption ?? ""}
              className="h-full w-full object-cover"
            />
          )}
        </button>
      ) : item.type === "FRASE" ? (
        <button
          type="button"
          onClick={onEdit}
          className="flex aspect-square w-full flex-col items-center justify-center rounded-[10px] border border-border p-4 text-center"
          style={{ backgroundColor: `${color}14` }}
        >
          <p className="font-serif text-sm italic text-text-primary">“{item.content}”</p>
        </button>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="flex aspect-square w-full items-center justify-center rounded-full px-4 text-center text-base font-semibold"
          style={{ backgroundColor: `${color}26`, color }}
        >
          {item.content}
        </button>
      )}

      {item.caption && (
        <p className="mt-1 truncate text-center text-xs text-text-secondary">{item.caption}</p>
      )}
    </div>
  );
}

export function MoodboardSection({
  pillarId,
  color,
  initialItems,
}: {
  pillarId: string;
  color: string;
  initialItems: MoodboardItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MoodboardItem | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  async function refresh() {
    const response = await fetch(`/api/vision/pillars/${pillarId}/moodboard`);
    setItems(await response.json());
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/vision/moodboard/${id}`, { method: "DELETE" });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    await Promise.all(
      reordered.map((item, index) =>
        fetch(`/api/vision/moodboard/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: index }),
        }),
      ),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Moodboard</h2>
        <Button variant="secondary" onClick={() => setCreating(true)}>
          <Plus size={14} />
          Adicionar
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum item no moodboard ainda.</p>
      ) : (
        <DndContext
          id={`moodboard-${pillarId}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-3">
              {items.map((item) => (
                <MoodboardCard
                  key={item.id}
                  item={item}
                  color={color}
                  onEdit={() => setEditing(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {creating && (
        <MoodboardItemModal
          pillarId={pillarId}
          mode="create"
          onClose={() => setCreating(false)}
          onSaved={refresh}
        />
      )}
      {editing && (
        <MoodboardItemModal
          pillarId={pillarId}
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
