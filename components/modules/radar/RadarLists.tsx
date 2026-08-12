"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, ExternalLink, PauseCircle, Trash2, X } from "lucide-react";
import { BusinessBadge, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatDateBR, todayInputValue } from "@/lib/utils";
import { taskTypeLabels } from "@/lib/labels";
import type {
  HabitSignal,
  ProjectSignal,
  RoutineSignal,
  TaskSignal,
} from "@/lib/radar";
import {
  ConsistencyBar,
  ConsistencyLabel,
  RadarRow,
  RadarSection,
} from "@/components/modules/radar/RadarSection";

/**
 * O radar some com o item assim que você decide sobre ele — retomar ou deixar
 * ir. Sem isso a linha ficaria na tela até o refresh e você não saberia se a
 * decisão pegou.
 */
function useResolver<T extends { id: string }>(initial: T[]) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(id: string, action: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    const previous = items;
    setItems((list) => list.filter((i) => i.id !== id));

    try {
      await action();
      router.refresh();
    } catch (e) {
      setItems(previous);
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return { items, busy, error, resolve };
}

function IconButton({
  title,
  onClick,
  disabled,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md p-1.5 text-text-secondary transition-colors hover:bg-black/[0.03] disabled:pointer-events-none disabled:opacity-40 ${
        danger ? "hover:text-red-600" : "hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ tarefas

export function RadarTasks({ tasks }: { tasks: TaskSignal[] }) {
  const { items, busy, error, resolve } = useResolver(tasks);

  return (
    <RadarSection
      title="Tarefas que ficaram para trás"
      count={items.length}
      hint="Criadas e nunca feitas, ou com o prazo já vencido."
    >
      <ErrorNote message={error} />
      {items.map((task) => (
        <RadarRow
          key={task.id}
          actions={
            <>
              <IconButton
                title="Trazer para hoje"
                disabled={busy === task.id}
                onClick={() =>
                  resolve(task.id, () =>
                    api.patch(`/api/tasks/${task.id}`, {
                      dueDate: todayInputValue(),
                    }),
                  )
                }
              >
                <CalendarPlus size={15} />
              </IconButton>
              <IconButton
                title="Deixar ir (apaga a tarefa)"
                danger
                disabled={busy === task.id}
                onClick={() => {
                  if (!confirm(`Apagar "${task.title}"? Isso não tem como desfazer.`)) return;
                  resolve(task.id, () => api.delete(`/api/tasks/${task.id}`));
                }}
              >
                <Trash2 size={15} />
              </IconButton>
            </>
          }
        >
          <p className="text-sm font-medium text-text-primary">{task.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <BusinessBadge business={task.business} />
            <span className="text-xs text-text-secondary">
              {task.daysOverdue !== null && task.dueDate
                ? `venceu em ${formatDateBR(new Date(task.dueDate))} · ${task.daysOverdue} ${
                    task.daysOverdue === 1 ? "dia" : "dias"
                  } atrás`
                : `parada há ${task.daysSinceCreated} dias, sem prazo`}
            </span>
          </div>
        </RadarRow>
      ))}
    </RadarSection>
  );
}

// ------------------------------------------------------------------ hábitos

export function RadarHabits({ habits }: { habits: HabitSignal[] }) {
  const { items, busy, error, resolve } = useResolver(habits);

  return (
    <RadarSection
      title="Hábitos escorregando"
      count={items.length}
      hint="Só o que falhou na metade ou mais dos dias que você registrou."
    >
      <ErrorNote message={error} />
      {items.map((habit) => (
        <RadarRow
          key={habit.id}
          actions={
            <>
              <Link
                href="/dia"
                title="Marcar no dia"
                aria-label="Marcar no dia"
                className="rounded-md p-1.5 text-text-secondary hover:bg-black/[0.03] hover:text-text-primary"
              >
                <ExternalLink size={15} />
              </Link>
              <IconButton
                title="Deixar ir (desativa o hábito)"
                disabled={busy === habit.id}
                onClick={() =>
                  resolve(habit.id, () =>
                    api.patch(`/api/habits/${habit.id}`, { active: false }),
                  )
                }
              >
                <X size={15} />
              </IconButton>
            </>
          }
        >
          <p className="text-sm font-medium text-text-primary">{habit.name}</p>
          <ConsistencyLabel
            done={habit.done}
            tracked={habit.tracked}
            untracked={habit.untracked}
          />
          {habit.daysSinceLast !== null && habit.daysSinceLast > 0 && (
            <span className="ml-1 text-xs text-text-secondary">
              · última vez há {habit.daysSinceLast}{" "}
              {habit.daysSinceLast === 1 ? "dia" : "dias"}
            </span>
          )}
          <ConsistencyBar done={habit.done} tracked={habit.tracked} />
        </RadarRow>
      ))}
    </RadarSection>
  );
}

// ------------------------------------------------------------------ rotinas

export function RadarRoutines({ routines }: { routines: RoutineSignal[] }) {
  const { items, busy, error, resolve } = useResolver(routines);

  return (
    <RadarSection
      title="Rotinas escorregando"
      count={items.length}
      hint="Só o que falhou na metade ou mais dos dias que você registrou."
    >
      <ErrorNote message={error} />
      {items.map((routine) => (
        <RadarRow
          key={routine.id}
          actions={
            <>
              <Link
                href="/configuracoes"
                title="Editar a rotina"
                aria-label="Editar a rotina"
                className="rounded-md p-1.5 text-text-secondary hover:bg-black/[0.03] hover:text-text-primary"
              >
                <ExternalLink size={15} />
              </Link>
              <IconButton
                title="Deixar ir (tira a rotina dos próximos dias)"
                danger
                disabled={busy === routine.id}
                onClick={() => {
                  if (
                    !confirm(
                      `Tirar "${routine.title}" da rotina? Ela para de aparecer nos próximos dias. O que já foi marcado fica no histórico.`,
                    )
                  )
                    return;
                  resolve(routine.id, () => api.delete(`/api/tasks/${routine.id}`));
                }}
              >
                <Trash2 size={15} />
              </IconButton>
            </>
          }
        >
          <p className="text-sm font-medium text-text-primary">{routine.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-badge-casa-bg px-2 py-0.5 text-[11px] font-medium text-badge-casa-text">
              {taskTypeLabels[routine.type] ?? routine.type}
            </span>
            <ConsistencyLabel
              done={routine.done}
              tracked={routine.tracked}
              untracked={routine.untracked}
            />
          </div>
          <ConsistencyBar done={routine.done} tracked={routine.tracked} />
        </RadarRow>
      ))}
    </RadarSection>
  );
}

// ----------------------------------------------------------------- projetos

export function RadarProjects({
  projects,
  windowDays,
}: {
  projects: ProjectSignal[];
  windowDays: number;
}) {
  const { items, busy, error, resolve } = useResolver(projects);

  return (
    <RadarSection
      title="Projetos parados"
      count={items.length}
      hint={`Ativos, sem nenhuma ação há ${windowDays} ${
        windowDays === 1 ? "dia" : "dias"
      } ou mais.`}
    >
      <ErrorNote message={error} />
      {items.map((project) => (
        <RadarRow
          key={project.id}
          actions={
            <>
              <Link
                href={`/negocios/${project.businessId}/projetos/${project.id}`}
                title="Abrir o projeto"
                aria-label="Abrir o projeto"
                className="rounded-md p-1.5 text-text-secondary hover:bg-black/[0.03] hover:text-text-primary"
              >
                <ExternalLink size={15} />
              </Link>
              <IconButton
                title="Deixar ir (pausa o projeto)"
                disabled={busy === project.id}
                onClick={() =>
                  resolve(project.id, () =>
                    api.patch(`/api/projects/${project.id}`, { status: "PAUSADO" }),
                  )
                }
              >
                <PauseCircle size={15} />
              </IconButton>
            </>
          }
        >
          <p className="text-sm font-medium text-text-primary">{project.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <BusinessBadge
              business={{ name: project.businessName, color: project.businessColor }}
            />
            <span className="text-xs text-text-secondary">
              {project.daysSinceAction}{" "}
              {project.daysSinceAction === 1 ? "dia" : "dias"} sem ação ·
              última: {project.lastActionLabel}
              {project.openTasks > 0 &&
                ` · ${project.openTasks} ${
                  project.openTasks === 1 ? "tarefa aberta" : "tarefas abertas"
                }`}
            </span>
          </div>
        </RadarRow>
      ))}
    </RadarSection>
  );
}
