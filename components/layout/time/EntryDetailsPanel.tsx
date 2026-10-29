"use client";

import { useEffect, useState } from "react";
import { Play, Settings2 } from "lucide-react";
import { api } from "@/lib/client-api";
import type { EntryDetails } from "@/lib/pomodoro";
import type {
  ActivityCategoryDTO,
  PomodoroSettingsDTO,
  ProjectOptionDTO,
  TaskOptionDTO,
} from "@/lib/time-tracking-shared";

const fieldClass =
  "w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent";

/**
 * O formulário do cronômetro, estilo Toggl: o que está fazendo, em que
 * categoria e em que projeto/tarefa. Serve para começar (com ou sem pomodoro)
 * e para completar o que já está rodando.
 */
export function EntryDetailsPanel({
  categories,
  projects,
  settings,
  initial,
  running,
  onStart,
  onSave,
  onOpenSettings,
  busy,
}: {
  categories: ActivityCategoryDTO[];
  projects: ProjectOptionDTO[];
  settings: PomodoroSettingsDTO;
  initial: EntryDetails;
  /** Há um registro rodando: o painel edita em vez de iniciar. */
  running: boolean;
  onStart: (details: EntryDetails, pomodoro: boolean) => void;
  onSave: (details: EntryDetails) => void;
  onOpenSettings?: () => void;
  busy: boolean;
}) {
  const [details, setDetails] = useState(initial);
  const [pomodoro, setPomodoro] = useState(true);
  // Guarda de que projeto são as tarefas: trocar de projeto esconde as antigas
  // na hora, sem esperar a resposta nem limpar o estado dentro do efeito.
  const [loaded, setLoaded] = useState<{ projectId: string; tasks: TaskOptionDTO[] } | null>(null);

  const set = <K extends keyof EntryDetails>(key: K, value: EntryDetails[K]) =>
    setDetails((d) => ({ ...d, [key]: value }));

  const { projectId } = details;
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    api
      .get<TaskOptionDTO[]>(`/api/time-options?projectId=${encodeURIComponent(projectId)}`)
      .then((tasks) => !cancelled && setLoaded({ projectId, tasks }))
      .catch(() => !cancelled && setLoaded({ projectId, tasks: [] }));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const tasks = loaded && loaded.projectId === projectId ? loaded.tasks : [];

  // Projetos agrupados pelo negócio: "Ace › Novo Milênio".
  const byBusiness = new Map<string, ProjectOptionDTO[]>();
  for (const project of projects) {
    byBusiness.set(project.businessName, [
      ...(byBusiness.get(project.businessName) ?? []),
      project,
    ]);
  }

  const canSubmit = !busy && Boolean(details.categoryId);

  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        if (running) onSave(details);
        else onStart(details, pomodoro);
      }}
    >
      <input
        autoFocus
        value={details.title}
        onChange={(e) => set("title", e.target.value)}
        placeholder="No que você vai trabalhar?"
        className={`${fieldClass} font-medium`}
        maxLength={200}
      />
      <textarea
        value={details.description}
        onChange={(e) => set("description", e.target.value)}
        placeholder="Descrição do que foi feito (opcional)"
        rows={2}
        className={`${fieldClass} resize-none`}
        maxLength={2000}
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-text-secondary">
          Categoria
          <select
            value={details.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            className={`${fieldClass} normal-case tracking-normal`}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-text-secondary">
          Projeto
          <select
            value={details.projectId ?? ""}
            onChange={(e) =>
              setDetails((d) => ({ ...d, projectId: e.target.value || null, taskId: null }))
            }
            className={`${fieldClass} normal-case tracking-normal`}
          >
            <option value="">Sem projeto</option>
            {[...byBusiness.entries()].map(([business, list]) => (
              <optgroup key={business} label={business}>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.clientName ? ` — ${p.clientName}` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      {details.projectId && (
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-text-secondary">
          Tarefa
          <select
            value={details.taskId ?? ""}
            onChange={(e) => set("taskId", e.target.value || null)}
            className={`${fieldClass} normal-case tracking-normal`}
          >
            <option value="">Sem tarefa específica</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {!running && (
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={pomodoro}
            onChange={(e) => setPomodoro(e.target.checked)}
            className="size-4 accent-accent"
          />
          Pomodoro ({settings.focusMinutes} min de foco, {settings.shortBreakMinutes} de pausa)
        </label>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        {onOpenSettings ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-text-secondary hover:bg-hover hover:text-text-primary"
          >
            <Settings2 size={14} />
            Configurar
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast hover:bg-accent/90 disabled:opacity-50"
        >
          {running ? (
            "Salvar"
          ) : (
            <>
              <Play size={14} />
              {pomodoro ? "Iniciar foco" : "Iniciar cronômetro"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
