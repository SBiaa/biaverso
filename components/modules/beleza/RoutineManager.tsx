"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge, Button, Card, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { routineTimeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ProductOption, RoutineStepView, RoutineView } from "@/lib/beleza-shared";
import { RoutineFormModal } from "./RoutineFormModal";
import { RoutineStepFormModal } from "./RoutineStepFormModal";

function SortableStep({
  step,
  onEdit,
  onDelete,
}: {
  step: RoutineStepView;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reordenar passo"
        className="cursor-grab text-text-secondary"
      >
        <GripVertical size={16} />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text-primary">{step.title}</p>
        {(step.productName || step.notes) && (
          <p className="truncate text-xs text-text-secondary">
            {[step.productName, step.notes].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <button
        type="button"
        title="Editar passo"
        onClick={onEdit}
        className="text-text-secondary hover:text-text-primary"
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        title="Deletar passo"
        onClick={onDelete}
        className="text-text-secondary hover:text-red-600"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function RoutineCard({
  routine,
  products,
  onError,
}: {
  routine: RoutineView;
  products: ProductOption[];
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState(routine.steps);
  const [syncedFrom, setSyncedFrom] = useState(routine.steps);
  const [editingRoutine, setEditingRoutine] = useState(false);
  const [stepModal, setStepModal] = useState<
    { mode: "create" } | { mode: "edit"; step: RoutineStepView } | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Lista nova vinda do servidor (depois de criar/editar/deletar um passo)
  // substitui a cópia local, sem remontar o card e fechar o que estava aberto.
  if (syncedFrom !== routine.steps) {
    setSyncedFrom(routine.steps);
    setSteps(routine.steps);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const previous = steps;
    const reordered = arrayMove(
      steps,
      steps.findIndex((s) => s.id === active.id),
      steps.findIndex((s) => s.id === over.id),
    );

    onError(null);
    setSteps(reordered);

    try {
      await api.patch(`/api/beauty/routines/${routine.id}/steps`, {
        ids: reordered.map((s) => s.id),
      });
    } catch (e) {
      // Sem isto a nova ordem ficava só na tela e sumia no próximo refresh.
      setSteps(previous);
      onError(errorMessage(e));
    }
  }

  async function deleteRoutine() {
    if (
      !confirm(
        `Deletar a rotina "${routine.name}"? Os passos e o histórico dela vão junto.`,
      )
    )
      return;

    onError(null);
    try {
      await api.delete(`/api/beauty/routines/${routine.id}`);
      router.refresh();
    } catch (e) {
      onError(errorMessage(e));
    }
  }

  async function deleteStep(step: RoutineStepView) {
    const previous = steps;
    onError(null);
    setSteps((prev) => prev.filter((s) => s.id !== step.id));

    try {
      await api.delete(`/api/beauty/routines/${routine.id}/steps/${step.id}`);
      router.refresh();
    } catch (e) {
      setSteps(previous);
      onError(errorMessage(e));
    }
  }

  return (
    <>
      <Card className={cn("flex flex-col gap-3", !routine.active && "opacity-60")}>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            {open ? (
              <ChevronDown size={16} className="shrink-0 text-text-secondary" />
            ) : (
              <ChevronRight size={16} className="shrink-0 text-text-secondary" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                {routine.name}
              </p>
              <p className="text-xs text-text-secondary">
                {steps.length} {steps.length === 1 ? "passo" : "passos"}
                {!routine.active && " · inativa"}
              </p>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <Badge>{routineTimeLabels[routine.timeOfDay]}</Badge>
            <button
              type="button"
              title="Editar rotina"
              onClick={() => setEditingRoutine(true)}
              className="text-text-secondary hover:text-text-primary"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              title="Deletar rotina"
              onClick={deleteRoutine}
              className="text-text-secondary hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {open && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            {steps.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Nenhum passo ainda.
              </p>
            ) : (
              <DndContext
                id={`routine-steps-${routine.id}`}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={steps.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-1.5">
                    {steps.map((step) => (
                      <SortableStep
                        key={step.id}
                        step={step}
                        onEdit={() => setStepModal({ mode: "edit", step })}
                        onDelete={() => deleteStep(step)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            <Button
              variant="secondary"
              className="self-start px-3 py-1 text-xs"
              onClick={() => setStepModal({ mode: "create" })}
            >
              <Plus size={13} />
              Adicionar passo
            </Button>
          </div>
        )}
      </Card>

      {editingRoutine && (
        <RoutineFormModal routine={routine} onClose={() => setEditingRoutine(false)} />
      )}

      {stepModal && (
        <RoutineStepFormModal
          routineId={routine.id}
          step={stepModal.mode === "edit" ? stepModal.step : undefined}
          products={products}
          onClose={() => setStepModal(null)}
        />
      )}
    </>
  );
}

export function RoutineManager({
  routines,
  products,
}: {
  routines: RoutineView[];
  products: ProductOption[];
}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <ErrorNote message={error} />

      {routines.length === 0 && (
        <p className="text-sm text-text-secondary">
          Nenhuma rotina cadastrada.
        </p>
      )}

      {routines.map((routine) => (
        <RoutineCard
          key={routine.id}
          routine={routine}
          products={products}
          onError={setError}
        />
      ))}

      <Button className="self-start" onClick={() => setCreating(true)}>
        <Plus size={14} />
        Nova rotina
      </Button>

      {creating && <RoutineFormModal onClose={() => setCreating(false)} />}
    </div>
  );
}
