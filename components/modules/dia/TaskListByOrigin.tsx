"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import {
  AttentionBadge,
  Badge,
  BusinessBadge,
  Button,
  ErrorNote,
  InlineEdit,
  originLabels,
  type BadgeOrigin,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { SubtaskList, SubtaskToggle, useSubtasks, type SubtaskItem } from "@/components/modules/tarefas/Subtasks";

type TaskItem = {
  id: string;
  title: string;
  done: boolean;
  origin: BadgeOrigin;
  /** Null nas avulsas — só rotina/faxina ganham selo de tipo. */
  typeLabel: string | null;
  business: { name: string; color: string } | null;
  overdue: boolean;
  subtasks: SubtaskItem[];
};

type TaskListByOriginProps = {
  dayId: string;
  /** Data do dia aberto (YYYY-MM-DD) — a tarefa vence no dia que está na tela, não em "hoje". */
  dayDate: string;
  /** Dia aberto já passou: o que for criado aqui já nasce atrasado. */
  dayInPast: boolean;
  initialTasks: TaskItem[];
};

const originOptions = Object.keys(originLabels) as BadgeOrigin[];

function TaskRow({
  task,
  onToggle,
  onRename,
}: {
  task: TaskItem;
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => Promise<unknown>;
}) {
  const subtasks = useSubtasks({ kind: "task", id: task.id }, task.subtasks);
  // Tarefa com passos abertos já nasce expandida: o ponto é ver por onde começar.
  const [open, setOpen] = useState(task.subtasks.length > 0 && !task.done);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex w-full items-center gap-2 pl-1 text-sm">
        {/* O círculo e o texto viraram alvos separados: antes a linha inteira
            era um botão de marcar, então não havia onde clicar para renomear
            sem concluir a tarefa junto. */}
        <button
          type="button"
          onClick={() => onToggle(task.id)}
          aria-label={task.done ? `Desmarcar ${task.title}` : `Marcar ${task.title}`}
          // Marcar é a ação principal desta tela no celular. O ícone continua
          // com 16px; a margem negativa devolve ao layout o espaço do alvo de
          // 44px, para a linha não crescer.
          className="-m-3 flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-hover"
        >
          {task.done ? (
            <CheckCircle2 size={16} className="text-accent" />
          ) : (
            <Circle size={16} className="text-text-secondary" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <InlineEdit
            value={task.title}
            ariaLabel="Tarefa"
            onSave={(title) => onRename(task.id, title)}
            className={cn(
              "block text-text-primary",
              task.done && "text-text-secondary line-through",
            )}
          />
        </div>
        {/* Selos à direita: os títulos ficam alinhados numa coluna só. */}
        <span className="flex shrink-0 items-center gap-1.5">
          {task.typeLabel && <Badge>{task.typeLabel}</Badge>}
          {task.business && <BusinessBadge business={task.business} />}
          {task.overdue && !task.done && (
            <AttentionBadge level="atrasado">
              Atrasado
            </AttentionBadge>
          )}
          <SubtaskToggle
            open={open}
            onClick={() => setOpen((v) => !v)}
            doneCount={subtasks.doneCount}
            total={subtasks.subtasks.length}
          />
        </span>
      </div>

      {open && (
        <div className="pl-7">
          <SubtaskList {...subtasks} />
        </div>
      )}
    </div>
  );
}

export function TaskListByOrigin({
  dayId,
  dayDate,
  dayInPast,
  initialTasks,
}: TaskListByOriginProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [origin, setOrigin] = useState<BadgeOrigin>("PESSOAL");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tasksByOrigin = tasks.reduce<Record<string, TaskItem[]>>((acc, task) => {
    (acc[task.origin] ??= []).push(task);
    return acc;
  }, {});

  async function toggle(id: string) {
    const previous = tasks;
    const nextDone = !tasks.find((t) => t.id === id)?.done;

    setError(null);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: nextDone } : t)));

    try {
      await api.patch(`/api/tasks/${id}`, { done: nextDone });
    } catch (e) {
      setTasks(previous);
      setError(errorMessage(e));
    }
  }

  /**
   * O texto novo já está na tela quando isto roda (o InlineEdit fecha depois
   * do await), então aqui só falta gravar e refletir na lista. O erro sobe
   * para o campo, que fica aberto com o que foi digitado.
   */
  async function rename(id: string, title: string) {
    await api.patch(`/api/tasks/${id}`, { title });
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
  }

  async function addTask() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const task = await api.post<{ id: string; title: string }>("/api/tasks", {
        title: title.trim(),
        origin,
        dayId,
        dueDate: dayDate,
      });
      setTasks((prev) => [
        ...prev,
        {
          id: task.id,
          title: task.title,
          done: false,
          origin,
          typeLabel: null,
          business: null,
          overdue: dayInPast,
          subtasks: [],
        },
      ]);
      setTitle("");
      setShowForm(false);
    } catch (e) {
      // A tarefa não entra na lista se não foi gravada.
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ErrorNote message={error} />

      {tasks.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhuma tarefa para hoje.</p>
      ) : (
        Object.entries(tasksByOrigin).map(([taskOrigin, items]) => (
          <div key={taskOrigin} className="flex flex-col gap-1.5">
            <Badge origin={taskOrigin as BadgeOrigin} />
            {items.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={toggle}
                onRename={rename}
              />
            ))}
          </div>
        ))
      )}

      {showForm ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da tarefa"
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value as BadgeOrigin)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            {originOptions.map((o) => (
              <option key={o} value={o}>
                {originLabels[o]}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button onClick={addTask} disabled={saving}>
              Salvar
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setShowForm(true)}>
          <Plus size={16} />
          Adicionar tarefa avulsa
        </Button>
      )}
    </div>
  );
}
