"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Plus } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { cn, formatDateBR } from "@/lib/utils";
import { ProjectStatusSelect } from "./ProjectStatusSelect";

type TaskItem = {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  tasks: TaskItem[];
};

export function ProjectCard({ project }: { project: Project }) {
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState(project.tasks);
  const [showAddTask, setShowAddTask] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleDone(task: TaskItem) {
    const nextDone = !task.done;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: nextDone } : t)),
    );
    fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: nextDone }),
    });
  }

  async function addTask() {
    if (!title.trim()) return;
    setSaving(true);
    const response = await fetch(`/api/projects/${project.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      }),
    });
    const task = await response.json();
    setTasks((prev) => [...prev, task]);
    setTitle("");
    setDueDate("");
    setSaving(false);
    setShowAddTask(false);
  }

  return (
    <Card className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown size={16} className="text-text-secondary" />
          ) : (
            <ChevronRight size={16} className="text-text-secondary" />
          )}
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {project.name}
            </p>
            {project.description && (
              <p className="text-xs text-text-secondary">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <ProjectStatusSelect projectId={project.id} initialStatus={project.status} />
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhuma tarefa neste projeto.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {tasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => toggleDone(task)}
                    className="flex w-full items-center justify-between gap-2 text-left text-sm"
                  >
                    <span className="flex items-center gap-2">
                      {task.done ? (
                        <CheckCircle2 size={16} className="text-accent" />
                      ) : (
                        <Circle size={16} className="text-text-secondary" />
                      )}
                      <span
                        className={cn(
                          "text-text-primary",
                          task.done && "text-text-secondary line-through",
                        )}
                      >
                        {task.title}
                      </span>
                    </span>
                    {task.dueDate && (
                      <span className="text-xs text-text-secondary">
                        {formatDateBR(new Date(task.dueDate))}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showAddTask ? (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3">
              <input
                autoFocus
                placeholder="Título da tarefa"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="flex gap-2">
                <Button onClick={addTask} disabled={saving}>
                  Salvar
                </Button>
                <Button variant="ghost" onClick={() => setShowAddTask(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setShowAddTask(true)}>
              <Plus size={14} />
              Nova tarefa
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
