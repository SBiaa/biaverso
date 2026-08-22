"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Button,
  confirmAction,
  ErrorNote,
  Modal,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { productionTypeLabels, priorityLabels, productionStatusLabels } from "@/lib/labels";
import { addUtcDays, formatDateBR, parseDateOnly, toDateInputValue } from "@/lib/utils";
import {
  INTERNAL_CLIENT,
  projectsForClient,
  type ClientOption,
  type ProjectOption,
} from "./ContentPostModal";
import { ClientOptions } from "./ClientOptions";

const typeOptions = Object.keys(productionTypeLabels);
const priorityOptions = Object.keys(priorityLabels);
const statusOptions = Object.keys(productionStatusLabels);

export type TaskRecord = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  /** Null = tarefa interna do próprio negócio. */
  clientId: string | null;
  projectId: string | null;
};
type TaskInitial = TaskRecord;

function dateInputValue(date: string | Date | null) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayInputValue() {
  return dateInputValue(new Date());
}

function mostRecentProjectId(projects: ProjectOption[], clientId: string) {
  const clientProjects = projectsForClient(projects, clientId).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return clientProjects[0]?.id ?? "";
}

function emptyForm(
  clients: ClientOption[],
  projects: ProjectOption[],
  defaultClientId?: string,
  defaultProjectId?: string,
  defaultDate?: string,
) {
  const clientId = defaultClientId ?? clients[0]?.id ?? INTERNAL_CLIENT;
  return {
    title: "",
    type: typeOptions[0],
    description: "",
    priority: "NORMAL",
    status: "A_FAZER",
    dueDate: defaultDate ?? "",
    completedAt: "",
    notes: "",
    clientId,
    projectId: defaultProjectId ?? mostRecentProjectId(projects, clientId),
  };
}

function formFromTask(task: TaskInitial) {
  return {
    title: task.title,
    type: task.type,
    description: task.description ?? "",
    priority: task.priority,
    status: task.status,
    dueDate: dateInputValue(task.dueDate),
    completedAt: dateInputValue(task.completedAt),
    notes: task.notes ?? "",
    clientId: task.clientId ?? INTERNAL_CLIENT,
    projectId: task.projectId ?? "",
  };
}

export function ProductionTaskModal({
  businessId,
  clients,
  projects,
  task,
  defaultClientId,
  defaultProjectId,
  defaultDate,
  onClose,
}: {
  businessId: string;
  clients: ClientOption[];
  projects: ProjectOption[];
  task?: TaskInitial;
  defaultClientId?: string;
  defaultProjectId?: string;
  /** "YYYY-MM-DD" — preenche o prazo ao criar a partir de um dia do calendário. */
  defaultDate?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!task;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(
    task
      ? formFromTask(task)
      : emptyForm(clients, projects, defaultClientId, defaultProjectId, defaultDate),
  );

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "clientId") {
        next.projectId = mostRecentProjectId(projects, value);
      }
      if (key === "status" && value === "CONCLUIDO" && !prev.completedAt) {
        next.completedAt = todayInputValue();
      }
      return next;
    });
  }

  const clientProjects = projectsForClient(projects, form.clientId);

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      businessId,
      clientId: form.clientId || null,
      projectId: form.projectId || null,
      dueDate: form.dueDate || null,
      completedAt: form.completedAt || null,
    };

    try {
      if (isEdit) await api.patch(`/api/ace/tasks/${task!.id}`, payload);
      else await api.post("/api/ace/tasks", payload);
      router.refresh();
      notify("Salvo.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  // Copia a tarefa para a semana seguinte — útil pra produção recorrente
  // (ex.: "edição do reels toda semana") sem preencher tudo de novo.
  async function handleDuplicate() {
    if (!isEdit) return;
    setSaving(true);
    setError(null);

    const nextDate = form.dueDate
      ? toDateInputValue(addUtcDays(parseDateOnly(form.dueDate)!, 7))
      : "";

    const payload = {
      title: form.title,
      type: form.type,
      description: form.description,
      priority: form.priority,
      status: "A_FAZER",
      dueDate: nextDate || null,
      completedAt: null,
      notes: form.notes,
      businessId,
      clientId: form.clientId || null,
      projectId: form.projectId || null,
    };

    try {
      await api.post("/api/ace/tasks", payload);
      router.refresh();
      notify(
        nextDate
          ? `Duplicado para ${formatDateBR(new Date(`${nextDate}T00:00:00Z`))}.`
          : "Duplicado.",
      );
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    const confirmed = await confirmAction({
      title: "Excluir esta tarefa de produção?",
      destructive: true,
    });
    if (!confirmed) return;
    setDeleting(true);
    setError(null);

    try {
      await api.delete(`/api/ace/tasks/${task!.id}`);
      router.refresh();
      notify("Excluído.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "Editar tarefa" : "Nova tarefa de produção"}
      size="md"
      onClose={onClose}
      onSubmit={handleSubmit}
    >

      <input
        placeholder="Título"
        value={form.title}
        onChange={(e) => update("title", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />

      <select
        value={form.type}
        onChange={(e) => update("type", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        {typeOptions.map((t) => (
          <option key={t} value={t}>
            {productionTypeLabels[t]}
          </option>
        ))}
      </select>

      <textarea
        placeholder="Descrição / briefing"
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        rows={2}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />

      <div className="grid grid-cols-2 gap-2">
        <select
          value={form.priority}
          onChange={(e) => update("priority", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          {priorityOptions.map((p) => (
            <option key={p} value={p}>
              {priorityLabels[p]}
            </option>
          ))}
        </select>
        <select
          value={form.status}
          onChange={(e) => update("status", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {productionStatusLabels[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-text-secondary">Prazo máximo</p>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => update("dueDate", e.target.value)}
            className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-text-secondary">Finalização</p>
          <input
            type="date"
            value={form.completedAt}
            onChange={(e) => update("completedAt", e.target.value)}
            className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={form.clientId}
          onChange={(e) => update("clientId", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value={INTERNAL_CLIENT}>Projeto interno</option>
          <ClientOptions clients={clients} />
        </select>
        <select
          value={form.projectId}
          onChange={(e) => update("projectId", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Sem projeto</option>
          {clientProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <textarea
        placeholder="Notas"
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
        rows={2}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />

      <ErrorNote message={error} />

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            Salvar
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
        {isEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleDuplicate} disabled={saving || deleting}>
              Duplicar
            </Button>
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:bg-red-50"
            >
              Excluir
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
