"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardTitle,
  ErrorNote,
  IconButton,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import {
  SubtaskList,
  SubtaskToggle,
  useSubtasks,
  type SubtaskItem,
} from "@/components/modules/tarefas/Subtasks";

type TemplateItem = { id: string; title: string; subtasks: SubtaskItem[] };
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

  // Os passos são gravados na hora, direto no template; só o título e a ordem
  // esperam o "Salvar". Por isso a rotina ainda não gravada não os mostra —
  // sem id no banco não há onde pendurá-los.
  const saved = !isNewId(item.id);
  const subtasks = useSubtasks({ kind: "task", id: item.id }, item.subtasks);
  const [open, setOpen] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-1.5 rounded-md border border-border px-2 py-1.5"
    >
      <div className="flex items-center gap-2">
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
        {saved && (
          <SubtaskToggle
            open={open}
            onClick={() => setOpen((v) => !v)}
            doneCount={subtasks.doneCount}
            total={subtasks.subtasks.length}
          />
        )}
        <IconButton
          onClick={() => onDelete(item.id)}
          tone="danger"
        >
          <Trash2 size={15} />
        </IconButton>
      </div>

      {saved && open && (
        <div className="pl-6">
          <p className="mb-1 text-xs text-text-secondary">
            Estes passos aparecem em toda cópia diária desta rotina.
          </p>
          <SubtaskList {...subtasks} checkable={false} />
        </div>
      )}
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
  const [error, setError] = useState<string | null>(null);
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
    setItems((prev) => [
      ...prev,
      { id: `new-${crypto.randomUUID()}`, title: newTitle.trim(), subtasks: [] },
    ]);
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
    setError(null);
    try {
      const removedIds = [...originalIds.current].filter(
        (id) => !items.some((i) => i.id === id),
      );

      const savedItems = await Promise.all(
        items.map(async (item, index) => {
          if (isNewId(item.id)) {
            const created = await api.post<{ id: string; title: string }>(
              "/api/tasks/routines",
              { title: item.title, type, order: index },
            );
            // Rotina nova nasce sem passos: só depois de salva ela tem id para
            // pendurá-los, e a linha remonta com o id do banco.
            return { id: created.id, title: created.title, subtasks: [] };
          }

          await api.patch(`/api/tasks/routines/${item.id}`, {
            title: item.title,
            order: index,
          });
          return item;
        }),
      );

      await Promise.all(removedIds.map((id) => api.delete(`/api/tasks/routines/${id}`)));

      setItems(savedItems);
      originalIds.current = new Set(savedItems.map((i) => i.id));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      setSaveState("error");
      setError(errorMessage(e));
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>{title}</CardTitle>

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

      <ErrorNote message={error} />

      <Button onClick={handleSave} disabled={saveState === "saving"}>
        {SAVE_LABEL[saveState]}
      </Button>
    </Card>
  );
}
