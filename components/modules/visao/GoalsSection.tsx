"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardTitle,
  ErrorNote,
  IconButton,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, hexToRgba } from "@/lib/utils";
import { goalTermLabels, measuredGoalStatusLabels } from "@/lib/labels";
import { formatDateBR } from "@/lib/utils";
import { formatGoalValue, goalProgress } from "@/lib/vision-shared";
import type { PriorityLevelDTO } from "@/lib/task-plan";
import { ConceptualGoalFormModal } from "./ConceptualGoalFormModal";
import {
  MeasuredGoalFormModal,
  type BusinessOption,
  type MeasuredGoalInitial,
} from "./MeasuredGoalFormModal";

type MeasuredGoal = MeasuredGoalInitial;

type ConceptualGoal = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priorityLevelId: string | null;
  category: string | null;
  challenge: string | null;
  measuredGoals: MeasuredGoal[];
};

async function updateMeasuredGoal(id: string, patch: Record<string, unknown>) {
  await api.patch(`/api/vision/goals/measured/${id}`, patch);
}

function MeasuredGoalRow({
  goal,
  onChanged,
  onEdit,
  onDelete,
}: {
  goal: MeasuredGoal;
  onChanged: (patch: Partial<MeasuredGoal>) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const percent = goalProgress(goal);
  const hasNumericTarget = goal.targetValue !== null && goal.targetValue > 0;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-text-primary">{goal.title}</p>
          <p className="text-xs text-text-secondary">
            {hasNumericTarget
              ? `${formatGoalValue(goal.currentValue, goal.unit)} de ${formatGoalValue(goal.targetValue!, goal.unit)}`
              : goal.target}
            {goal.term && (
              <span>
                {hasNumericTarget || goal.target ? " · " : ""}
                {goalTermLabels[goal.term]}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onEdit} className="text-text-secondary hover:text-text-primary">
            <Pencil size={14} />
          </button>
          <button type="button" onClick={onDelete} className="text-text-secondary hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
        <span>{percent}%</span>
        <span>{goal.deadline ? formatDateBR(new Date(goal.deadline)) : "Sem prazo"}</span>
        <select
          value={goal.status}
          onChange={(e) => {
            const status = e.target.value;
            onChanged({ status });
            updateMeasuredGoal(goal.id, { status });
          }}
          className="rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
        >
          {Object.keys(measuredGoalStatusLabels).map((s) => (
            <option key={s} value={s}>
              {measuredGoalStatusLabels[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** Status, prioridade, categoria e desafio do objetivo conceitual, em linha. */
function ConceptualGoalMeta({
  goal,
  levels,
}: {
  goal: ConceptualGoal;
  levels: PriorityLevelDTO[];
}) {
  const level = levels.find((l) => l.id === goal.priorityLevelId);

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="rounded-full bg-border px-2 py-0.5 font-medium text-text-secondary">
        {measuredGoalStatusLabels[goal.status] ?? goal.status}
      </span>
      {level && (
        <span
          className="rounded-full px-2 py-0.5 font-medium"
          style={{ backgroundColor: hexToRgba(level.color, 0.14), color: level.color }}
        >
          {level.name}
        </span>
      )}
      {goal.category && <span className="text-text-secondary">{goal.category}</span>}
      {goal.challenge && (
        <span className="text-text-secondary">· Desafio: {goal.challenge}</span>
      )}
    </div>
  );
}

export function GoalsSection({
  pillarId,
  initialGoals,
  levels,
  businesses,
}: {
  pillarId: string;
  initialGoals: ConceptualGoal[];
  levels: PriorityLevelDTO[];
  businesses: BusinessOption[];
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingConceptual, setCreatingConceptual] = useState(false);
  const [editingConceptual, setEditingConceptual] = useState<ConceptualGoal | null>(null);
  const [creatingMeasuredFor, setCreatingMeasuredFor] = useState<string | null>(null);
  const [editingMeasured, setEditingMeasured] = useState<{
    conceptualGoalId: string;
    goal: MeasuredGoal;
  } | null>(null);

  async function refresh() {
    try {
      setGoals(await api.get<ConceptualGoal[]>(`/api/vision/goals/conceptual?pillarId=${pillarId}`));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleDeleteConceptual(id: string) {
    const previous = goals;
    setError(null);
    setGoals((prev) => prev.filter((g) => g.id !== id));

    try {
      // Os objetivos metrificados abaixo dele somem junto (onDelete: Cascade).
      await api.delete(`/api/vision/goals/conceptual/${id}`);
    } catch (e) {
      setGoals(previous);
      setError(errorMessage(e));
    }
  }

  async function handleDeleteMeasured(conceptualGoalId: string, id: string) {
    const previous = goals;
    setError(null);
    setGoals((prev) =>
      prev.map((g) =>
        g.id === conceptualGoalId
          ? { ...g, measuredGoals: g.measuredGoals.filter((m) => m.id !== id) }
          : g,
      ),
    );

    try {
      await api.delete(`/api/vision/goals/measured/${id}`);
    } catch (e) {
      setGoals(previous);
      setError(errorMessage(e));
    }
  }

  function patchMeasuredLocal(conceptualGoalId: string, id: string, patch: Partial<MeasuredGoal>) {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === conceptualGoalId
          ? {
              ...g,
              measuredGoals: g.measuredGoals.map((m) => (m.id === id ? { ...m, ...patch } : m)),
            }
          : g,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <CardTitle>Objetivos</CardTitle>
        <Button variant="secondary" onClick={() => setCreatingConceptual(true)}>
          <Plus size={14} />
          Novo objetivo conceitual
        </Button>
      </div>

      <ErrorNote message={error} />

      {goals.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum objetivo conceitual ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {goals.map((goal) => {
            const isExpanded = expandedId === goal.id;
            return (
              <Card key={goal.id} className="flex flex-col gap-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : goal.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setExpandedId(isExpanded ? null : goal.id);
                    }
                  }}
                  className="flex cursor-pointer items-center justify-between gap-2 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">{goal.title}</p>
                    {goal.description && (
                      <p className="text-xs text-text-secondary">{goal.description}</p>
                    )}
                    <ConceptualGoalMeta goal={goal} levels={levels} />
                  </div>
                  <div className="flex items-center gap-2">
                    <IconButton
                      onClick={(e) => {
                      e.stopPropagation();
                      setEditingConceptual(goal);
                      }}
                    >
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton
                      onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConceptual(goal.id);
                      }}
                      tone="danger"
                    >
                      <Trash2 size={15} />
                    </IconButton>
                    <ChevronDown
                      size={16}
                      className={cn(
                        "text-text-secondary transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </div>
                </div>

                {isExpanded && (
                  <div className="flex flex-col gap-2 border-t border-border pt-3">
                    {goal.measuredGoals.map((measured) => (
                      <MeasuredGoalRow
                        key={measured.id}
                        goal={measured}
                        onChanged={(patch) => patchMeasuredLocal(goal.id, measured.id, patch)}
                        onEdit={() => setEditingMeasured({ conceptualGoalId: goal.id, goal: measured })}
                        onDelete={() => handleDeleteMeasured(goal.id, measured.id)}
                      />
                    ))}
                    <Button
                      variant="ghost"
                      onClick={() => setCreatingMeasuredFor(goal.id)}
                      className="self-start"
                    >
                      <Plus size={14} />
                      Novo objetivo metrificado
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {creatingConceptual && (
        <ConceptualGoalFormModal
          pillarId={pillarId}
          mode="create"
          onClose={() => setCreatingConceptual(false)}
          onSaved={refresh}
        />
      )}
      {editingConceptual && (
        <ConceptualGoalFormModal
          pillarId={pillarId}
          mode="edit"
          initial={editingConceptual}
          onClose={() => setEditingConceptual(null)}
          onSaved={refresh}
        />
      )}
      {creatingMeasuredFor && (
        <MeasuredGoalFormModal
          conceptualGoalId={creatingMeasuredFor}
          businesses={businesses}
          mode="create"
          onClose={() => setCreatingMeasuredFor(null)}
          onSaved={refresh}
        />
      )}
      {editingMeasured && (
        <MeasuredGoalFormModal
          conceptualGoalId={editingMeasured.conceptualGoalId}
          businesses={businesses}
          mode="edit"
          initial={editingMeasured.goal}
          onClose={() => setEditingMeasured(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
