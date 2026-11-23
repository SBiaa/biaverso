"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Circle,
  FolderOpen,
  X,
} from "lucide-react";
import { InlineEdit } from "@/components/ui";
import { errorMessage } from "@/lib/client-api";
import { cn, formatDateBR, hexToRgba } from "@/lib/utils";
import type { PriorityLevelDTO } from "@/lib/task-plan";
import { SubtaskList, type useSubtasks } from "@/components/modules/tarefas/Subtasks";
import { TaskStatusPicker } from "@/components/modules/tarefas/TaskStatusPicker";
import { DateInput, EstimateInput, PrioritySelect } from "@/components/modules/dia/WorkTaskFields";
import type {
  DateField,
  Patch,
  ProjectOption,
  TaskEdit,
  WorkTask,
} from "@/components/modules/dia/WorkTasksToday";
import type { TaskStatus } from "@/app/generated/prisma/enums";
import { BusinessCover } from "@/components/modules/negocios/BusinessCover";
import { StagedSteps } from "@/components/modules/ace/StagedSteps";
import {
  ProductionActions,
  ProductionProperties,
  useProductionExtras,
  type SaveTask,
} from "@/components/modules/ace/ProductionPanelParts";
import type { ProductionExtras } from "@/lib/production-peek";

/** Para onde leva o botão de origem, conforme o tipo da tarefa. */
const originLinkLabel: Record<WorkTask["kind"], string> = {
  production: "Abrir o negócio",
  collection: "Abrir a coleção",
  prospect: "Abrir o cliente",
  lesson: "Abrir o curso",
  study: "Abrir os estudos",
  task: "Abrir",
  post: "Abrir o negócio",
};

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-center gap-2 py-1 text-sm">
      <span className="text-text-secondary">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Texto longo que grava ao sair do campo, como uma página do Notion. */
function NoteField({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onSave: (next: string | null) => Promise<unknown>;
}) {
  const [text, setText] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);

  async function commit() {
    const next = text.trim() || null;
    if (next === (value ?? null)) return;
    setError(null);
    try {
      await onSave(next);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        placeholder={placeholder}
        rows={3}
        aria-label={label}
        className="w-full resize-y rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-secondary/60 hover:border-border focus:border-border focus:ring-2 focus:ring-accent"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </section>
  );
}

/**
 * Painel lateral da tarefa, no lugar do "peek" do Notion: abre por cima da
 * tela sem sair dela e mostra de onde a tarefa é (negócio › projeto), tudo que
 * dá para mudar nela e os atalhos para o projeto e para a origem.
 */
export function TaskPeek({
  task,
  levels,
  projects,
  coverVersion,
  subtasks,
  onClose,
  onToggle,
  onPatch,
  onStatus,
  onDate,
  onEdit,
  onSave,
  onRemoved,
  production,
}: {
  task: WorkTask;
  levels: PriorityLevelDTO[];
  projects: ProjectOption[];
  /** Quando a capa do negócio mudou (ms); `null` = sem capa, vai a cor. */
  coverVersion: number | null;
  subtasks: ReturnType<typeof useSubtasks>;
  onClose: () => void;
  onToggle: (task: WorkTask) => void;
  onPatch: (task: WorkTask, patch: Patch) => void;
  onStatus: (task: WorkTask, status: TaskStatus) => void;
  onDate: (task: WorkTask, field: DateField, value: string | null) => void;
  onEdit: (task: WorkTask, edit: TaskEdit) => Promise<unknown>;
  /** Grava um campo que só a tarefa de produção tem (tipo, cliente...). */
  onSave: SaveTask;
  /** A tarefa foi excluída pelo painel: some da lista de quem abriu. */
  onRemoved?: (task: WorkTask) => void;
  /** Já buscado por quem abriu; sem isso o painel busca sozinho. */
  production?: ProductionExtras;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const { extras, setExtras, error: extrasError } = useProductionExtras(task, production);
  const onCloseRef = useRef(onClose);
  const [projectError, setProjectError] = useState<string | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      // Esc dentro de um campo já cancela a edição dele; não fecha o painel junto.
      // `instanceof Element`: com o foco na própria página o alvo é o
      // `document`, que não tem `matches` — o Esc quebrava em vez de fechar.
      const target = e.target;
      if (e.key !== "Escape") return;
      if (target instanceof Element && target.matches("input, textarea, select")) return;
      onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, []);

  // Aula e estudo espiritual não têm passos, prioridade nem tempo.
  const plain = task.kind === "lesson" || task.kind === "study";
  const hasSteps = !plain && task.kind !== "prospect";
  const hasPlan = task.kind !== "study" && task.kind !== "task" && task.kind !== "post";
  const canRename =
    task.kind === "production" || task.kind === "collection" || task.kind === "task" || task.kind === "post";
  const canPickProject =
    (task.kind === "production" || task.kind === "post") && task.businessId !== null;
  // Post não tem dia de fazer: o dia dele é o da publicação.
  const isPost = task.kind === "post";
  const projectOptions = projects.filter((p) => p.businessId === task.businessId);
  // Projeto concluído ou pausado não vem na lista, mas continua sendo o da tarefa.
  if (task.project && !projectOptions.some((p) => p.id === task.project!.id)) {
    projectOptions.unshift({ id: task.project.id, name: task.project.name, businessId: task.businessId ?? "" });
  }

  async function changeProject(projectId: string | null) {
    setProjectError(null);
    try {
      await onEdit(task, { projectId });
    } catch (e) {
      setProjectError(errorMessage(e));
    }
  }

  const chipStyle = {
    backgroundColor: hexToRgba(task.originColor, 0.12),
    color: task.originColor,
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/20"
      // `mousedown`: selecionar um texto do painel e soltar fora não fecha.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={task.title}
        tabIndex={-1}
        className="peek-in flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-surface shadow-2xl outline-none"
      >
        {/* Capa do negócio: bate o olho e já sabe de onde a tarefa é. */}
        <BusinessCover
          businessId={task.businessId ?? ""}
          color={task.originColor}
          version={task.businessId ? coverVersion : null}
          className="h-28 shrink-0"
        />

        {/* Barra do topo: de onde a tarefa é, e o X. */}
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface px-4 py-2">
          <nav aria-label="Origem" className="flex min-w-0 flex-1 items-center gap-1 text-xs">
            {task.originHref ? (
              <Link
                href={task.originHref}
                className="truncate rounded-full px-2 py-0.5 font-medium hover:underline"
                style={chipStyle}
              >
                {task.originLabel}
              </Link>
            ) : (
              <span className="truncate rounded-full px-2 py-0.5 font-medium" style={chipStyle}>
                {task.originLabel}
              </span>
            )}
            {task.project && (
              <>
                <ChevronRight size={12} className="shrink-0 text-text-secondary" aria-hidden />
                <Link
                  href={task.project.href}
                  className="inline-flex min-w-0 items-center gap-1 truncate rounded px-1 py-0.5 font-medium text-text-primary hover:bg-hover"
                >
                  <FolderOpen size={12} className="shrink-0" aria-hidden />
                  <span className="truncate">{task.project.name}</span>
                </Link>
              </>
            )}
          </nav>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-hover hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5">
          {/* Título */}
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => onToggle(task)}
              className="-mx-3 -mb-3 -mt-1.5 flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={task.done ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
            >
              {task.done ? (
                <CheckCircle2 size={20} className="text-accent-ink" />
              ) : (
                <Circle size={20} className="text-text-secondary" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <InlineEdit
                value={task.title}
                ariaLabel="Título da tarefa"
                disabled={!canRename}
                multiline
                onSave={(title) => onEdit(task, { title })}
                className={cn(
                  "block text-xl font-semibold text-text-primary",
                  task.done && "text-text-secondary line-through",
                )}
                inputClassName="text-xl font-semibold"
              />
              {task.detail && (
                <p className="mt-0.5 text-sm text-text-secondary">{task.detail}</p>
              )}
            </div>
          </div>

          {/* Propriedades, como a tabela de propriedades de uma página do Notion. */}
          <div className="flex flex-col">
            <Property label={task.kind === "collection" ? "Coleção" : task.kind === "prospect" ? "Cliente" : "Origem"}>
              {task.originHref ? (
                <Link
                  href={task.originHref}
                  className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium hover:underline"
                  style={chipStyle}
                >
                  {task.originLabel}
                </Link>
              ) : (
                <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={chipStyle}>
                  {task.originLabel}
                </span>
              )}
            </Property>
            <Property label="Projeto">
              {canPickProject ? (
                <div className="flex items-center gap-1.5">
                  <select
                    value={task.project?.id ?? ""}
                    onChange={(e) => changeProject(e.target.value || null)}
                    aria-label="Projeto"
                    className={cn(
                      "min-w-0 max-w-full flex-1 cursor-pointer truncate rounded-md border bg-transparent px-1.5 py-1 text-sm outline-none hover:border-border focus:border-border focus:ring-2 focus:ring-accent",
                      // Sem projeto é justamente o que deixa a tarefa sem contexto:
                      // fica marcado para ela escolher.
                      task.project
                        ? "border-transparent font-medium text-text-primary"
                        : "border-dashed border-warning text-warning",
                    )}
                  >
                    <option value="">Sem projeto — escolher</option>
                    {projectOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {task.project && (
                    <Link
                      href={task.project.href}
                      aria-label={`Ir para o projeto ${task.project.name}`}
                      title="Ir para o projeto"
                      className="shrink-0 rounded p-1 text-text-secondary hover:bg-hover hover:text-text-primary"
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                  )}
                </div>
              ) : task.project ? (
                <Link
                  href={task.project.href}
                  className="inline-flex items-center gap-1 px-1.5 py-1 font-medium text-text-primary hover:text-accent-ink hover:underline"
                >
                  <FolderOpen size={14} aria-hidden />
                  {task.project.name}
                </Link>
              ) : (
                <span className="px-1.5 text-text-secondary/60">Sem projeto</span>
              )}
              {projectError && <p className="text-xs text-danger">{projectError}</p>}
            </Property>

            {task.kind === "production" &&
              (extras ? (
                <ProductionProperties
                  task={task}
                  extras={extras}
                  Property={Property}
                  onExtras={setExtras}
                  onSave={onSave}
                />
              ) : (
                <p className={cn("py-1 text-xs", extrasError ? "text-danger" : "text-text-secondary")}>
                  {extrasError ?? "Carregando tipo e cliente…"}
                </p>
              ))}

            {/* Na produção já existe "No Kanban" (a coluna do negócio); este é o
                andamento pessoal — iniciei, pausei… — e ganha o nome dele. */}
            <Property label={task.kind === "production" ? "Andamento" : "Status"}>
              {task.progress === null ? (
                <span className="px-1.5 text-text-secondary">{task.kind === "post"
                    ? task.done
                      ? "Publicado"
                      : "A publicar"
                    : task.done
                      ? "Feita"
                      : "A fazer"}</span>
              ) : (
                <TaskStatusPicker
                  status={task.done ? "CONCLUIDA" : task.progress}
                  title={task.title}
                  onChange={(status) => onStatus(task, status)}
                />
              )}
            </Property>

            {hasPlan && (
              <>
                <Property label="Prioridade">
                  <PrioritySelect
                    task={task}
                    levels={levels}
                    onChange={(priorityLevelId) => onPatch(task, { priorityLevelId })}
                  />
                </Property>
                <Property label="Tempo">
                  <EstimateInput
                    key={task.estimateMinutes ?? "none"}
                    minutes={task.estimateMinutes}
                    disabled={task.done}
                    onCommit={(estimateMinutes) => onPatch(task, { estimateMinutes })}
                  />
                </Property>
              </>
            )}

            {!isPost && (
              <Property label="Realização">
                <DateInput
                  value={task.scheduledDate}
                  label={`Realização de ${task.title}`}
                  late={false}
                  onCommit={(value) => onDate(task, "scheduledDate", value)}
                />
              </Property>
            )}
            <Property label={isPost ? "Publicação" : "Prazo"}>
              <DateInput
                value={task.dueDate}
                label={`${isPost ? "Publicação" : "Prazo"} de ${task.title}`}
                late={task.overdue && !task.done}
                onCommit={(value) => onDate(task, "dueDate", value)}
              />
            </Property>
            {task.done && task.completedAt && (
              <Property label="Concluída em">
                <span className="px-1.5 text-text-secondary">
                  {formatDateBR(new Date(task.completedAt))}
                </span>
              </Property>
            )}
          </div>

          {task.description !== undefined && (
            <NoteField
              label="Descrição"
              value={task.description}
              placeholder="O que precisa ser feito, referências, combinados…"
              onSave={(description) => onEdit(task, { description })}
            />
          )}

          {task.notes !== undefined && (
            <NoteField
              label="Notas"
              value={task.notes}
              placeholder="Anotações soltas"
              onSave={(notes) => onEdit(task, { notes })}
            />
          )}

          {hasSteps && (
            <section className="flex flex-col gap-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Passos
                {subtasks.subtasks.length > 0 &&
                  ` · ${subtasks.doneCount}/${subtasks.subtasks.length}`}
              </h3>
              {/* Produção tem passos por etapa (Roteiro, Gravação...), como no
                  Kanban; o resto segue a lista simples. */}
              {task.kind === "production" ? (
                <StagedSteps
                  steps={subtasks.subtasks.map((s) => ({ ...s, stage: s.stage ?? null }))}
                  checkable
                  type={extras?.type ?? ""}
                  error={subtasks.error}
                  saving={subtasks.saving}
                  onAdd={subtasks.add}
                  onToggle={subtasks.toggle}
                  onRename={subtasks.rename}
                  onRemove={subtasks.remove}
                  onRenameStage={subtasks.renameStage}
                  // Um a um, na ordem: o servidor põe cada passo no fim da lista.
                  onApplyTemplate={async (items) => {
                    for (const item of items) {
                      if (!(await subtasks.add(item.title, item.stage))) break;
                    }
                  }}
                />
              ) : (
                <SubtaskList {...subtasks} />
              )}
            </section>
          )}

          {task.kind === "production" && extras && (
            <ProductionActions
              task={task}
              extras={extras}
              steps={subtasks.subtasks}
              onRemoved={onRemoved}
              onClose={onClose}
            />
          )}

          {/* Atalhos para sair do dia e ir ao lugar da tarefa. */}
          {(task.project || task.originHref) && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {task.project && (
                <Link
                  href={task.project.href}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-hover"
                >
                  <FolderOpen size={14} aria-hidden />
                  Ir para o projeto
                </Link>
              )}
              {task.originHref && (
                <Link
                  href={task.originHref}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-hover"
                >
                  <ArrowUpRight size={14} aria-hidden />
                  {originLinkLabel[task.kind]}
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
