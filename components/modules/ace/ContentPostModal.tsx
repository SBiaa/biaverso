"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { postTypeLabels, socialNetworkLabels, contentStatusLabels } from "@/lib/labels";

const typeOptions = Object.keys(postTypeLabels);
const networkOptions = Object.keys(socialNetworkLabels);
const statusOptions = Object.keys(contentStatusLabels);

export type ClientOption = { id: string; name: string };
export type ProjectOption = { id: string; name: string; clientId: string | null; createdAt: string };

export type PostRecord = {
  id: string;
  title: string;
  type: string;
  network: string;
  status: string;
  publishDate: string | null;
  completedAt: string | null;
  caption: string | null;
  notes: string | null;
  clientId: string;
  projectId: string | null;
};
type PostInitial = PostRecord;

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
  const clientProjects = projects
    .filter((p) => p.clientId === clientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return clientProjects[0]?.id ?? "";
}

function emptyForm(
  clients: ClientOption[],
  projects: ProjectOption[],
  defaultClientId?: string,
  defaultProjectId?: string,
) {
  const clientId = defaultClientId ?? clients[0]?.id ?? "";
  return {
    title: "",
    type: typeOptions[0],
    network: networkOptions[0],
    status: "PLANEJADO",
    publishDate: "",
    completedAt: "",
    caption: "",
    notes: "",
    clientId,
    projectId: defaultProjectId ?? mostRecentProjectId(projects, clientId),
  };
}

function formFromPost(post: PostInitial) {
  return {
    title: post.title,
    type: post.type,
    network: post.network,
    status: post.status,
    publishDate: dateInputValue(post.publishDate),
    completedAt: dateInputValue(post.completedAt),
    caption: post.caption ?? "",
    notes: post.notes ?? "",
    clientId: post.clientId,
    projectId: post.projectId ?? "",
  };
}

export function ContentPostModal({
  businessId,
  clients,
  projects,
  post,
  defaultClientId,
  defaultProjectId,
  onClose,
}: {
  businessId: string;
  clients: ClientOption[];
  projects: ProjectOption[];
  post?: PostInitial;
  defaultClientId?: string;
  defaultProjectId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!post;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(
    post ? formFromPost(post) : emptyForm(clients, projects, defaultClientId, defaultProjectId),
  );

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "clientId") {
        next.projectId = mostRecentProjectId(projects, value);
      }
      if (key === "status" && value === "PUBLICADO" && !prev.completedAt) {
        next.completedAt = todayInputValue();
      }
      return next;
    });
  }

  const clientProjects = projects.filter((p) => p.clientId === form.clientId);

  async function handleSubmit() {
    if (!form.title.trim() || !form.clientId) return;
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      businessId,
      projectId: form.projectId || null,
      publishDate: form.publishDate || null,
      completedAt: form.completedAt || null,
    };

    try {
      if (isEdit) await api.patch(`/api/ace/posts/${post!.id}`, payload);
      else await api.post("/api/ace/posts", payload);
      router.refresh();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm("Excluir este post do cronograma?")) return;
    setDeleting(true);
    setError(null);

    try {
      await api.delete(`/api/ace/posts/${post!.id}`);
      router.refresh();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            {isEdit ? "Editar post" : "Novo post"}
          </h3>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        <input
          placeholder="Título"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />

        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.type}
            onChange={(e) => update("type", e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {postTypeLabels[t]}
              </option>
            ))}
          </select>
          <select
            value={form.network}
            onChange={(e) => update("network", e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            {networkOptions.map((n) => (
              <option key={n} value={n}>
                {socialNetworkLabels[n]}
              </option>
            ))}
          </select>
        </div>

        <select
          value={form.status}
          onChange={(e) => update("status", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {contentStatusLabels[s]}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs text-text-secondary">Publicação</p>
            <input
              type="date"
              value={form.publishDate}
              onChange={(e) => update("publishDate", e.target.value)}
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
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
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
          placeholder="Legenda"
          value={form.caption}
          onChange={(e) => update("caption", e.target.value)}
          rows={2}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
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
            <Button onClick={handleSubmit} disabled={saving}>
              Salvar
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
          {isEdit && (
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:bg-red-50"
            >
              Excluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
