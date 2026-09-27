"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { GripVertical } from "lucide-react";
import {
  Button,
  Card,
  CardTitle,
  ErrorNote,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import {
  moduleLabels,
  moduleDescriptions,
  type BusinessModuleState,
} from "@/lib/business-modules";

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "Salvar",
  saving: "Salvando...",
  saved: "Salvo!",
  error: "Erro ao salvar",
};

function SortableRow({
  item,
  onToggle,
}: {
  item: BusinessModuleState;
  onToggle: (module: BusinessModuleState["module"]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.module });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-md border border-border px-2 py-2",
        !item.active && "opacity-60",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reordenar ${moduleLabels[item.module]}`}
        className="cursor-grab text-text-secondary"
      >
        <GripVertical size={16} />
      </button>

      <div className="flex-1">
        <p className="text-sm font-medium text-text-primary">{moduleLabels[item.module]}</p>
        <p className="text-xs text-text-secondary">{moduleDescriptions[item.module]}</p>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
        <input
          type="checkbox"
          checked={item.active}
          onChange={() => onToggle(item.module)}
          className="h-4 w-4 accent-[var(--color-accent,#6366F1)]"
        />
        {item.active ? "Ligado" : "Desligado"}
      </label>
    </div>
  );
}

/**
 * Liga, desliga e reordena os módulos do negócio. A ordem das linhas é a ordem
 * das abas. Desligar não apaga nada — os dados do módulo continuam no banco.
 */
export function BusinessModulesForm({
  businessId,
  initialModules,
}: {
  businessId: string;
  initialModules: BusinessModuleState[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialModules);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleToggle(module: BusinessModuleState["module"]) {
    setItems((prev) =>
      prev.map((i) => (i.module === module ? { ...i, active: !i.active } : i)),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.module === active.id);
      const newIndex = prev.findIndex((i) => i.module === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  async function handleSave() {
    setSaveState("saving");
    setError(null);

    try {
      await api.patch(`/api/businesses/${businessId}/modules`, {
        modules: items.map((i) => ({ module: i.module, active: i.active })),
      });
      router.refresh();
      notify("Salvo.");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      setSaveState("error");
      setError(errorMessage(e));
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <CardTitle>Módulos</CardTitle>
        <p className="text-xs text-text-secondary">
          Marque o que este negócio usa. A ordem da lista é a ordem das abas.
        </p>
      </div>

      <DndContext
        id={`business-modules-${businessId}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.module)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-1.5">
            {items.map((item) => (
              <SortableRow key={item.module} item={item} onToggle={handleToggle} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <ErrorNote message={error} />

      <Button onClick={handleSave} disabled={saveState === "saving"}>
        {SAVE_LABEL[saveState]}
      </Button>
    </Card>
  );
}
