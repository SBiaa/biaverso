"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { measuredGoalStatusLabels } from "@/lib/labels";
import { formatDateBR } from "@/lib/utils";
import { ConceptualGoalFormModal } from "./ConceptualGoalFormModal";
import { MeasuredGoalFormModal } from "./MeasuredGoalFormModal";

type MeasuredGoal = {
  id: string;
  title: string;
  target: string | null;
  deadline: string | null;
  status: string;
  progress: number;
};

type ConceptualGoal = {
  id: string;
  title: string;
  description: string | null;
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
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-text-primary">{goal.title}</p>
          {goal.target && <p className="text-xs text-text-secondary">{goal.target}</p>}
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
          style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
        <span>{goal.progress}%</span>
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

export function GoalsSection({
  pillarId,
  initialGoals,
}: {
  pillarId: string;
  initialGoals: ConceptualGoal[];
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
        <h2 className="text-sm font-semibold text-text-primary">Objetivos</h2>
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
                  <div>
                    <p className="text-sm font-medium text-text-primary">{goal.title}</p>
                    {goal.description && (
                      <p className="text-xs text-text-secondary">{goal.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingConceptual(goal);
                      }}
                      className="text-text-secondary hover:text-text-primary"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConceptual(goal.id);
                      }}
                      className="text-text-secondary hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
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
          mode="create"
          onClose={() => setCreatingMeasuredFor(null)}
          onSaved={refresh}
        />
      )}
      {editingMeasured && (
        <MeasuredGoalFormModal
          conceptualGoalId={editingMeasured.conceptualGoalId}
          mode="edit"
          initial={editingMeasured.goal}
          onClose={() => setEditingMeasured(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
