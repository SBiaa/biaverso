"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Circle, Plus, Trash2 } from "lucide-react";

import { ErrorNote, IconButton, InlineEdit } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  stageTemplateName,
  stageTemplateStages,
  stageTemplateSteps,
  type StageTemplateStep,
} from "@/lib/post-stages";

export type StepRow = { id: string; title: string; done: boolean; stage: string | null };

type StagedStepsProps = {
  steps: StepRow[];
  /** Tarefa nova ainda não tem o que marcar: só ganha o passo ao salvar. */
  checkable: boolean;
  /** Tipo da tarefa: define qual modelo de etapas é sugerido. */
  type: string;
  error?: string | null;
  saving?: boolean;
  onAdd: (title: string, stage?: string) => Promise<boolean> | boolean;
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => Promise<unknown>;
  onRemove: (id: string) => void;
  onRenameStage: (from: string, to: string) => Promise<unknown>;
  onApplyTemplate: (steps: StageTemplateStep[]) => Promise<unknown> | void;
};

type Group = { stage: string | null; steps: StepRow[] };

/** Etapas na ordem em que aparecem; cada uma com os passos na ordem da lista. */
function groupByStage(steps: StepRow[]): Group[] {
  const groups: Group[] = [];
  for (const step of steps) {
    const found = groups.find((g) => g.stage === step.stage);
    if (found) found.steps.push(step);
    else groups.push({ stage: step.stage, steps: [step] });
  }
  return groups;
}

function AddStepField({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (title: string) => Promise<boolean> | boolean;
}) {
  const [title, setTitle] = useState("");

  async function submit() {
    if (await onAdd(title)) setTitle("");
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-md border border-border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <IconButton
        title="Adicionar passo"
        onClick={() => void submit()}
        disabled={!title.trim()}
        className="border border-border disabled:opacity-40"
      >
        <Plus size={15} />
      </IconButton>
    </div>
  );
}

/**
 * Passos de uma tarefa de produção agrupados em etapas (Roteiro, Gravação,
 * Edição, Postagem...). Quem usa decide onde gravar: na hora, pela API, ou só
 * na tela enquanto a tarefa ainda não existe.
 */
export function StagedSteps({
  steps,
  checkable,
  type,
  error,
  onAdd,
  onToggle,
  onRename,
  onRemove,
  onRenameStage,
  onApplyTemplate,
}: StagedStepsProps) {
  // Etapa criada agora que ainda não tem nenhum passo. Some desta lista quando
  // o primeiro passo entra, porque aí ela passa a existir nos próprios passos.
  const [emptyStages, setEmptyStages] = useState<string[]>([]);
  const [newStage, setNewStage] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState(false);

  const groups = groupByStage(steps);
  const stageNames = new Set(groups.map((g) => g.stage));
  const pendingStages = emptyStages.filter((name) => !stageNames.has(name));

  const templateName = stageTemplateName(type);
  const showTemplate = steps.length === 0 && pendingStages.length === 0 && templateName !== null;

  function addStage() {
    const name = newStage.trim();
    if (!name) return;
    if (!stageNames.has(name) && !emptyStages.includes(name)) {
      setEmptyStages((prev) => [...prev, name]);
    }
    setNewStage("");
  }

  async function applyTemplate() {
    setApplying(true);
    try {
      await onApplyTemplate(stageTemplateSteps(type));
    } finally {
      setApplying(false);
    }
  }

  function renderGroup(stage: string | null, groupSteps: StepRow[]) {
    const key = stage ?? "";
    const done = groupSteps.filter((s) => s.done).length;
    const complete = checkable && groupSteps.length > 0 && done === groupSteps.length;
    // Etapa toda feita fecha sozinha; a pessoa pode reabrir.
    const isCollapsed = collapsed[key] ?? complete;

    return (
      <div key={`stage-${key}`} className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCollapsed((prev) => ({ ...prev, [key]: !isCollapsed }))}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Abrir etapa" : "Fechar etapa"}
            className="flex size-6 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-hover"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
          <div className="min-w-0 flex-1 text-xs font-medium uppercase tracking-wide text-text-secondary">
            {stage === null ? (
              "Sem etapa"
            ) : (
              <InlineEdit
                value={stage}
                ariaLabel="Nome da etapa"
                onSave={(next) => onRenameStage(stage, next)}
                className="block"
              />
            )}
          </div>
          {checkable && groupSteps.length > 0 && (
            <span className={cn("text-xs text-text-secondary", complete && "text-accent")}>
              {done}/{groupSteps.length}
            </span>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex flex-col gap-1 border-l border-border pl-3">
            {groupSteps.map((step) => (
              <div key={step.id} className="group flex items-center gap-2 text-sm">
                {checkable ? (
                  <button
                    type="button"
                    onClick={() => onToggle(step.id)}
                    aria-label={step.done ? "Desmarcar passo" : "Marcar passo"}
                    className="-m-3 flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-hover"
                  >
                    {step.done ? (
                      <CheckCircle2 size={14} className="text-accent" />
                    ) : (
                      <Circle size={14} className="text-text-secondary" />
                    )}
                  </button>
                ) : (
                  <Circle size={14} className="shrink-0 text-text-secondary/50" />
                )}
                <div className="min-w-0 flex-1">
                  <InlineEdit
                    value={step.title}
                    ariaLabel="Passo"
                    onSave={(next) => onRename(step.id, next)}
                    className={cn(
                      "block text-text-primary",
                      checkable && step.done && "text-text-secondary line-through",
                    )}
                  />
                </div>
                <IconButton
                  title="Apagar passo"
                  onClick={() => onRemove(step.id)}
                  tone="danger"
                  className="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            ))}
            <AddStepField
              placeholder={stage === null ? "Quebrar em um passo…" : `Passo de ${stage}…`}
              onAdd={(title) => onAdd(title, stage ?? undefined)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {showTemplate && (
        <button
          type="button"
          onClick={() => void applyTemplate()}
          disabled={applying}
          className="rounded-md border border-dashed border-border px-3 py-2 text-left text-sm hover:bg-hover disabled:opacity-50"
        >
          <span className="font-medium text-text-primary">
            Usar as etapas de {templateName}
          </span>
          <span className="block text-xs text-text-secondary">
            {stageTemplateStages(type).join(" · ")} — você edita depois
          </span>
        </button>
      )}

      {groups.map((g) => renderGroup(g.stage, g.steps))}
      {pendingStages.map((name) => renderGroup(name, []))}

      <div className="flex items-center gap-1.5">
        <input
          value={newStage}
          onChange={(e) => setNewStage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addStage();
            }
          }}
          placeholder="Nova etapa (ex.: Aprovação)…"
          className="min-w-0 flex-1 rounded-md border border-border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <IconButton
          title="Adicionar etapa"
          onClick={addStage}
          disabled={!newStage.trim()}
          className="border border-border disabled:opacity-40"
        >
          <Plus size={15} />
        </IconButton>
      </div>

      {/* Sem etapa nenhuma ainda: o campo solto mantém o fluxo antigo de passos. */}
      {groups.length === 0 && pendingStages.length === 0 && (
        <AddStepField placeholder="Quebrar em um passo…" onAdd={(title) => onAdd(title)} />
      )}

      <ErrorNote message={error ?? null} />
    </div>
  );
}
