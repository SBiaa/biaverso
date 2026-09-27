"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { knowledgeAreaLabels, knowledgeTypeLabels, studyStatusLabels } from "@/lib/labels";
import { formatDateBR } from "@/lib/utils";

const statusOptions = Object.keys(studyStatusLabels);

type Knowledge = {
  id: string;
  title: string;
  source: string | null;
  type: string;
  area: string;
  status: string;
  summary: string | null;
  link: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

export function KnowledgeCard({ item: initialItem }: { item: Knowledge }) {
  const router = useRouter();
  const [item, setItem] = useState(initialItem);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(status: string) {
    const previous = item;
    setError(null);
    setItem((prev) => ({ ...prev, status }));

    try {
      // O servidor devolve o item já com startedAt/finishedAt resolvidos.
      setItem(await api.patch<Knowledge>(`/api/knowledge/${item.id}`, { status }));
    } catch (e) {
      setItem(previous);
      setError(errorMessage(e));
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir "${item.title}"?`)) return;

    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/api/knowledge/${item.id}`);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-1.5">
      <ErrorNote message={error} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-text-primary">{item.title}</p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-text-secondary">{knowledgeTypeLabels[item.type]}</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label={`Excluir ${item.title}`}
            className="rounded p-1 text-text-secondary hover:bg-black/[0.03] disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-fit rounded-full bg-badge-pessoal-bg px-2 py-0.5 text-xs font-medium text-badge-pessoal-text">
          {knowledgeAreaLabels[item.area]}
        </span>
        <select
          value={item.status}
          onChange={(e) => save(e.target.value)}
          className="w-fit rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {studyStatusLabels[s]}
            </option>
          ))}
        </select>
      </div>

      {item.source && <p className="text-xs text-text-secondary">{item.source}</p>}
      {item.summary && <p className="text-xs text-text-secondary">{item.summary}</p>}
      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-accent"
        >
          Abrir link
        </a>
      )}

      {(item.startedAt || item.finishedAt) && (
        <p className="text-xs text-text-secondary">
          {item.startedAt && `Começou em ${formatDateBR(new Date(item.startedAt))}`}
          {item.startedAt && item.finishedAt && " · "}
          {item.finishedAt && `Concluído em ${formatDateBR(new Date(item.finishedAt))}`}
        </p>
      )}
    </Card>
  );
}
