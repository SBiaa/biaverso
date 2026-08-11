"use client";

import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { documentTypeColors, documentTypeLabels } from "@/lib/labels";
import { hexToRgba } from "@/lib/utils";

export type ProjectDocument = {
  id: string;
  title: string;
  url: string;
  type: string;
  notes: string | null;
};

const typeOptions = Object.keys(documentTypeLabels);

const emptyForm = { title: "", url: "", type: "LINK", notes: "" };

export function ProjectDocuments({
  projectId,
  initialDocuments,
}: {
  projectId: string;
  initialDocuments: ProjectDocument[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<ProjectDocument>(
        `/api/projects/${projectId}/documents`,
        { ...form, notes: form.notes || null },
      );
      setDocuments((prev) => [...prev, created]);
      setForm(emptyForm);
      setAdding(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const previous = documents;
    setError(null);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    try {
      await api.delete(`/api/projects/${projectId}/documents/${id}`);
    } catch (e) {
      setDocuments(previous);
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {documents.length === 0 && !adding && (
        <p className="text-sm text-text-secondary">Nenhum documento ainda.</p>
      )}

      <ul className="flex flex-col gap-2">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: hexToRgba(documentTypeColors[doc.type] ?? "#6B7280", 0.12),
                    color: documentTypeColors[doc.type] ?? "#6B7280",
                  }}
                >
                  {documentTypeLabels[doc.type] ?? doc.type}
                </span>
                {/* `noreferrer` junto do `_blank`: sem ele a aba aberta ganha
                    acesso a esta janela pelo `window.opener`. */}
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-1 text-sm font-medium text-accent hover:underline"
                >
                  <span className="truncate">{doc.title}</span>
                  <ExternalLink size={13} className="shrink-0" />
                </a>
              </div>
              {doc.notes && (
                <p className="mt-1 text-xs text-text-secondary">{doc.notes}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => remove(doc.id)}
              aria-label={`Remover ${doc.title}`}
              className="shrink-0 rounded-md p-1 text-text-secondary hover:bg-black/[0.03] hover:text-red-600"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Título"
              className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            >
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {documentTypeLabels[t]}
                </option>
              ))}
            </select>
          </div>
          <input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://…"
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Observação (opcional)"
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={add}
              disabled={saving || !form.title.trim() || !form.url.trim()}
            >
              Adicionar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAdding(false);
                setForm(emptyForm);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setAdding(true)}
          className="self-start"
        >
          <Plus size={14} />
          Adicionar documento
        </Button>
      )}

      <ErrorNote message={error} />
    </div>
  );
}
