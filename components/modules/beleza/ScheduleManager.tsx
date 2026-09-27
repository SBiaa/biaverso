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
  RotateCw,
  Trash2,
} from "lucide-react";
import {
  Button,
  Card,
  confirmAction,
  ErrorNote,
  IconButton,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatDateBR } from "@/lib/utils";
import type { ProductOption, ScheduleStepView, ScheduleView } from "@/lib/beleza-shared";
import { ScheduleFormModal } from "./ScheduleFormModal";
import { ScheduleStepFormModal } from "./ScheduleStepFormModal";
import { CycleDots, UrgencyPill } from "./shared";

function SortableCycleStep({
  step,
  index,
  isCurrent,
  onEdit,
  onDelete,
}: {
  step: ScheduleStepView;
  index: number;
  isCurrent: boolean;
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
      className={cn(
        "flex items-center gap-2 rounded-md border px-2 py-1.5",
        isCurrent ? "border-accent bg-accent/5" : "border-border",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reordenar etapa"
        className="cursor-grab text-text-secondary"
      >
        <GripVertical size={16} />
      </button>

      <span className="text-xs text-text-secondary">{index + 1}.</span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text-primary">
          {step.title}
          {isCurrent && (
            <span className="ml-2 text-xs font-medium text-accent">etapa da vez</span>
          )}
        </p>
        <p className="truncate text-xs text-text-secondary">
          {[
            `a cada ${step.intervalDays} ${step.intervalDays === 1 ? "dia" : "dias"}`,
            step.productName,
            step.description,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <IconButton
        title="Editar etapa"
        onClick={onEdit}
      >
        <Pencil size={15} />
      </IconButton>
      <IconButton
        title="Deletar etapa"
        onClick={onDelete}
        tone="danger"
      >
        <Trash2 size={15} />
      </IconButton>
    </div>
  );
}

function ScheduleCard({
  schedule,
  products,
  onError,
}: {
  schedule: ScheduleView;
  products: ProductOption[];
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState(schedule.steps);
  const [syncedFrom, setSyncedFrom] = useState(schedule.steps);
  const [saving, setSaving] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [stepModal, setStepModal] = useState<
    { mode: "create" } | { mode: "edit"; step: ScheduleStepView } | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Lista nova do servidor substitui a cópia local sem fechar o card aberto.
  if (syncedFrom !== schedule.steps) {
    setSyncedFrom(schedule.steps);
    setSteps(schedule.steps);
  }

  const currentStep = steps[schedule.currentStepIndex];

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
      await api.patch(`/api/beauty/schedules/${schedule.id}/steps`, {
        ids: reordered.map((s) => s.id),
      });
      // A ordem mudou, então a "etapa da vez" pode ser outra — recarrega para
      // o indicador do ciclo não ficar apontando para o passo errado.
      router.refresh();
    } catch (e) {
      setSteps(previous);
      onError(errorMessage(e));
    }
  }

  async function registerStep() {
    setSaving(true);
    onError(null);
    try {
      await api.post(`/api/beauty/schedules/${schedule.id}/log`, {});
      router.refresh();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteSchedule() {
    const confirmed = await confirmAction({
      title: `Deletar o cronograma "${schedule.name}"?`,
      description: `As etapas e o histórico vão junto.`,
      destructive: true,
    });
    if (!confirmed) return;

    onError(null);
    try {
      await api.delete(`/api/beauty/schedules/${schedule.id}`);
      router.refresh();
      notify("Excluído.");
    } catch (e) {
      onError(errorMessage(e));
    }
  }

  async function deleteStep(step: ScheduleStepView) {
    const confirmed = await confirmAction({
      title: `Deletar a etapa "${step.title}"?`,
      description: `O histórico dela vai junto.`,
      destructive: true,
    });
    if (!confirmed) return;

    onError(null);
    try {
      await api.delete(`/api/beauty/schedules/${schedule.id}/steps/${step.id}`);
      router.refresh();
      notify("Excluído.");
    } catch (e) {
      onError(errorMessage(e));
    }
  }

  return (
    <>
      <Card className={cn("flex flex-col gap-3", !schedule.active && "opacity-60")}>
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
                {schedule.name}
              </p>
              <p className="truncate text-xs text-text-secondary">
                {currentStep
                  ? `Próxima etapa: ${currentStep.title}`
                  : "Sem etapas cadastradas"}
                {!schedule.active && " · inativo"}
              </p>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            {currentStep && (
              <UrgencyPill urgency={schedule.urgency} days={schedule.daysUntilNext} />
            )}
            <IconButton
              title="Editar cronograma"
              onClick={() => setEditingSchedule(true)}
            >
              <Pencil size={15} />
            </IconButton>
            <IconButton
              title="Deletar cronograma"
              onClick={deleteSchedule}
              tone="danger"
            >
              <Trash2 size={15} />
            </IconButton>
          </div>
        </div>

        {steps.length > 0 && (
          <div className="flex items-center justify-between gap-2">
            <CycleDots
              total={steps.length}
              currentIndex={schedule.currentStepIndex}
              titles={steps.map((s) => s.title)}
            />
            <Button
              variant="secondary"
              onClick={registerStep}
              disabled={saving}
              className="px-3 py-1 text-xs"
            >
              <RotateCw size={13} />
              Registrar etapa
            </Button>
          </div>
        )}

        {open && (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            {schedule.description && (
              <p className="text-sm text-text-secondary">{schedule.description}</p>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                Ciclo
              </p>

              {steps.length === 0 ? (
                <p className="text-sm text-text-secondary">Nenhuma etapa ainda.</p>
              ) : (
                <DndContext
                  id={`schedule-steps-${schedule.id}`}
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={steps.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-1.5">
                      {steps.map((step, index) => (
                        <SortableCycleStep
                          key={step.id}
                          step={step}
                          index={index}
                          isCurrent={index === schedule.currentStepIndex}
                          onEdit={() => setStepModal({ mode: "edit", step })}
                          onDelete={() => deleteStep(step)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {steps.length > 1 && (
                <p className="text-xs text-text-secondary">
                  Depois da última etapa o ciclo volta para {steps[0].title}.
                </p>
              )}

              <Button
                variant="secondary"
                className="self-start px-3 py-1 text-xs"
                onClick={() => setStepModal({ mode: "create" })}
              >
                <Plus size={13} />
                Adicionar etapa
              </Button>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-border pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                Histórico
              </p>
              {schedule.history.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Nenhuma etapa registrada ainda.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {schedule.history.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-baseline justify-between gap-2 text-sm"
                    >
                      <span className="text-text-primary">
                        {entry.stepTitle}
                        {entry.notes && (
                          <span className="text-text-secondary"> · {entry.notes}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-text-secondary">
                        {formatDateBR(new Date(entry.date))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>

      {editingSchedule && (
        <ScheduleFormModal
          schedule={schedule}
          onClose={() => setEditingSchedule(false)}
        />
      )}

      {stepModal && (
        <ScheduleStepFormModal
          scheduleId={schedule.id}
          step={stepModal.mode === "edit" ? stepModal.step : undefined}
          products={products}
          onClose={() => setStepModal(null)}
        />
      )}
    </>
  );
}

export function ScheduleManager({
  schedules,
  products,
}: {
  schedules: ScheduleView[];
  products: ProductOption[];
}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = schedules.filter((s) => s.active);
  const inactive = schedules.filter((s) => !s.active);

  return (
    <div className="flex flex-col gap-3">
      <ErrorNote message={error} />

      {schedules.length === 0 && (
        <p className="text-sm text-text-secondary">
          Nenhum cronograma cadastrado.
        </p>
      )}

      {active.map((schedule) => (
        <ScheduleCard
          key={schedule.id}
          schedule={schedule}
          products={products}
          onError={setError}
        />
      ))}

      {inactive.length > 0 && (
        <>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
            Inativos
          </p>
          {inactive.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              products={products}
              onError={setError}
            />
          ))}
        </>
      )}

      <Button className="self-start" onClick={() => setCreating(true)}>
        <Plus size={14} />
        Novo cronograma
      </Button>

      {creating && <ScheduleFormModal onClose={() => setCreating(false)} />}
    </div>
  );
}
