"use client";

import { useState } from "react";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, ErrorNote, IconButton, useConfirm } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { devLogKindColors, devLogKindLabels } from "@/lib/labels";
import { formatDateBR, hexToRgba, todayInputValue, toDateInputValue } from "@/lib/utils";

export type DevLogEntry = {
  id: string;
  date: string;
  kind: string;
  title: string;
  body: string | null;
  version: string | null;
  url: string | null;
};

const kindOptions = Object.keys(devLogKindLabels);

type Form = {
  date: string;
  kind: string;
  title: string;
  body: string;
  version: string;
  url: string;
};

const blankForm = (): Form => ({
  date: todayInputValue(),
  kind: "FUNCIONALIDADE",
  title: "",
  body: "",
  version: "",
  url: "",
});

const fieldClass =
  "rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

// Mais recente primeiro; no mesmo dia, mantém a ordem em que chegaram.
function sortEntries(list: DevLogEntry[]) {
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Diário de desenvolvimento: a história do sistema, uma entrada por coisa que
 * aconteceu. A documentação ao lado continua sendo o "o que é" do projeto.
 */
export function ProjectDevLog({
  projectId,
  initialEntries,
}: {
  projectId: string;
  initialEntries: DevLogEntry[];
}) {
  const confirm = useConfirm();
  const [entries, setEntries] = useState(() => sortEntries(initialEntries));
  // null = formulário fechado; "new" = entrada nova; id = editando aquela.
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(blankForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setForm(blankForm());
    setEditing("new");
  }

  function openEdit(entry: DevLogEntry) {
    setForm({
      date: toDateInputValue(entry.date),
      kind: entry.kind,
      title: entry.title,
      body: entry.body ?? "",
      version: entry.version ?? "",
      url: entry.url ?? "",
    });
    setEditing(entry.id);
  }

  function close() {
    setEditing(null);
    setForm(blankForm());
  }

  async function save() {
    setSaving(true);
    setError(null);
    const payload = {
      date: form.date || undefined,
      kind: form.kind,
      title: form.title,
      body: form.body || null,
      version: form.version || null,
      url: form.url || null,
    };
    try {
      if (editing === "new") {
        const created = await api.post<DevLogEntry>(`/api/projects/${projectId}/log`, payload);
        setEntries((prev) => sortEntries([created, ...prev]));
      } else if (editing) {
        const updated = await api.patch<DevLogEntry>(
          `/api/projects/${projectId}/log/${editing}`,
          payload,
        );
        setEntries((prev) => sortEntries(prev.map((e) => (e.id === updated.id ? updated : e))));
      }
      close();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(entry: DevLogEntry) {
    const ok = await confirm({
      title: "Apagar esta entrada do diário?",
      description: `"${entry.title}" sai do diário e não dá para desfazer.`,
      confirmLabel: "Apagar",
      destructive: true,
    });
    if (!ok) return;
    const previous = entries;
    setError(null);
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    try {
      await api.delete(`/api/projects/${projectId}/log/${entry.id}`);
    } catch (e) {
      setEntries(previous);
      setError(errorMessage(e));
    }
  }

  const formBox = (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="grid gap-2 sm:grid-cols-[auto_auto_1fr]">
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          aria-label="Data"
          className={fieldClass}
        />
        <select
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
          aria-label="Tipo"
          className={fieldClass}
        >
          {kindOptions.map((k) => (
            <option key={k} value={k}>
              {devLogKindLabels[k]}
            </option>
          ))}
        </select>
        <input
          value={form.version}
          onChange={(e) => setForm({ ...form, version: e.target.value })}
          placeholder="Versão (opcional), ex.: 1.2.0"
          className={fieldClass}
        />
      </div>
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="O que aconteceu? Ex.: login com Google"
        className={fieldClass}
      />
      <textarea
        value={form.body}
        onChange={(e) => setForm({ ...form, body: e.target.value })}
        rows={3}
        placeholder="Detalhes, por que foi feito, o que ficou faltando… (opcional)"
        className={`${fieldClass} resize-y`}
      />
      <input
        value={form.url}
        onChange={(e) => setForm({ ...form, url: e.target.value })}
        placeholder="Link do commit, PR ou deploy (opcional)"
        className={fieldClass}
      />
      <div className="flex gap-2">
        <Button type="button" onClick={save} disabled={saving || !form.title.trim()}>
          {editing === "new" ? "Adicionar" : "Salvar"}
        </Button>
        <Button type="button" variant="secondary" onClick={close}>
          Cancelar
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {editing === "new" ? (
        formBox
      ) : (
        <Button type="button" variant="secondary" onClick={openNew} className="self-start">
          <Plus size={14} />
          Nova entrada
        </Button>
      )}

      {entries.length === 0 && editing !== "new" && (
        <p className="text-sm text-text-secondary">
          Nada registrado ainda. Anote aqui o que for saindo: funcionalidades, correções,
          lançamentos, decisões.
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {entries.map((entry) =>
          editing === entry.id ? (
            <li key={entry.id}>{formBox}</li>
          ) : (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                  <span>{formatDateBR(new Date(entry.date))}</span>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: hexToRgba(devLogKindColors[entry.kind] ?? "#6B7280", 0.12),
                      color: devLogKindColors[entry.kind] ?? "#6B7280",
                    }}
                  >
                    {devLogKindLabels[entry.kind] ?? entry.kind}
                  </span>
                  {entry.version && <span className="font-mono">v{entry.version}</span>}
                </div>
                <p className="mt-1 text-sm font-medium text-text-primary">{entry.title}</p>
                {entry.body && (
                  <p className="mt-1 whitespace-pre-line text-sm text-text-secondary">
                    {entry.body}
                  </p>
                )}
                {entry.url && (
                  // `noreferrer` junto do `_blank`: sem ele a aba aberta ganha
                  // acesso a esta janela pelo `window.opener`.
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    Abrir link
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton onClick={() => openEdit(entry)} aria-label={`Editar ${entry.title}`}>
                  <Pencil size={15} />
                </IconButton>
                <IconButton
                  onClick={() => remove(entry)}
                  aria-label={`Apagar ${entry.title}`}
                  tone="danger"
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </li>
          ),
        )}
      </ol>

      <ErrorNote message={error} />
    </div>
  );
}
