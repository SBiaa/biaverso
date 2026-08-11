"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Link2Off, Lock, Plus, User } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { passwordCategoryLabels } from "@/lib/labels";

export type ProjectCredential = {
  id: string;
  passwordEntry: {
    id: string;
    name: string;
    login: string | null;
    password: string;
    url: string | null;
    category: string;
  };
};

export type PasswordOption = { id: string; name: string; category: string };

const emptyNew = { name: "", login: "", password: "", url: "", category: "OUTRO" };

/**
 * Credenciais do projeto — só o vínculo mora aqui; a senha continua sendo do
 * cofre. As rotas de API nunca devolvem o campo `password`: o valor chega pelo
 * render do servidor, igual à tela de Senhas, e a lista é recarregada com
 * `router.refresh()` depois de vincular.
 */
export function ProjectCredentials({
  projectId,
  initialCredentials,
  passwordOptions,
}: {
  projectId: string;
  initialCredentials: ProjectCredential[];
  passwordOptions: PasswordOption[];
}) {
  const router = useRouter();
  const [credentials, setCredentials] = useState(initialCredentials);
  const [linking, setLinking] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedId, setSelectedId] = useState(passwordOptions[0]?.id ?? "");
  const [newEntry, setNewEntry] = useState(emptyNew);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const linkedIds = new Set(credentials.map((c) => c.passwordEntry.id));
  const available = passwordOptions.filter((p) => !linkedIds.has(p.id));

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  async function link() {
    setSaving(true);
    setError(null);
    try {
      let passwordEntryId = selectedId;

      // "Criar nova" grava no cofre primeiro; o vínculo aponta para ela.
      if (mode === "new") {
        const created = await api.post<{ id: string }>("/api/passwords", {
          ...newEntry,
          login: newEntry.login || null,
          url: newEntry.url || null,
        });
        passwordEntryId = created.id;
      }

      await api.post(`/api/projects/${projectId}/credentials`, { passwordEntryId });
      setLinking(false);
      setNewEntry(emptyNew);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function unlink(id: string) {
    const previous = credentials;
    setError(null);
    setCredentials((prev) => prev.filter((c) => c.id !== id));
    try {
      await api.delete(`/api/projects/${projectId}/credentials/${id}`);
    } catch (e) {
      setCredentials(previous);
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {credentials.length === 0 && !linking && (
        <p className="text-sm text-text-secondary">
          Nenhuma credencial vinculada a este projeto.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {credentials.map(({ id, passwordEntry: entry }) => (
          <li
            key={id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">
                {entry.name}
                <span className="ml-2 text-xs font-normal text-text-secondary">
                  {passwordCategoryLabels[entry.category] ?? entry.category}
                </span>
              </p>
              {entry.login && (
                <p className="truncate text-xs text-text-secondary">{entry.login}</p>
              )}
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-text-secondary">
                  {visible === id
                    ? entry.password
                    : "•".repeat(Math.max(entry.password.length, 8))}
                </span>
                <button
                  type="button"
                  onClick={() => setVisible((v) => (v === id ? null : id))}
                  aria-label={visible === id ? "Ocultar senha" : "Mostrar senha"}
                  className="text-text-secondary hover:text-text-primary"
                >
                  {visible === id ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {entry.login && (
                <button
                  type="button"
                  title="Copiar login"
                  onClick={() => copy(entry.login!, `${id}-login`)}
                  className="rounded-md p-1.5 text-text-secondary hover:bg-black/[0.03] hover:text-text-primary"
                >
                  {copied === `${id}-login` ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <User size={14} />
                  )}
                </button>
              )}
              <button
                type="button"
                title="Copiar senha"
                onClick={() => copy(entry.password, `${id}-pass`)}
                className="rounded-md p-1.5 text-text-secondary hover:bg-black/[0.03] hover:text-text-primary"
              >
                {copied === `${id}-pass` ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <Lock size={14} />
                )}
              </button>
              <button
                type="button"
                title="Desvincular do projeto"
                onClick={() => unlink(id)}
                className="rounded-md p-1.5 text-text-secondary hover:bg-black/[0.03] hover:text-red-600"
              >
                <Link2Off size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {linking ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "existing" ? "primary" : "secondary"}
              onClick={() => setMode("existing")}
              className="px-3 py-1.5"
            >
              Do cofre
            </Button>
            <Button
              type="button"
              variant={mode === "new" ? "primary" : "secondary"}
              onClick={() => setMode("new")}
              className="px-3 py-1.5"
            >
              Criar nova
            </Button>
          </div>

          {mode === "existing" ? (
            available.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Todas as senhas do cofre já estão vinculadas a este projeto.
              </p>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
              >
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {passwordCategoryLabels[p.category] ?? p.category}
                  </option>
                ))}
              </select>
            )
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={newEntry.name}
                onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
                placeholder="Nome (ex: Instagram do cliente)"
                className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
              <select
                value={newEntry.category}
                onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
              >
                {Object.keys(passwordCategoryLabels).map((c) => (
                  <option key={c} value={c}>
                    {passwordCategoryLabels[c]}
                  </option>
                ))}
              </select>
              <input
                value={newEntry.login}
                onChange={(e) => setNewEntry({ ...newEntry, login: e.target.value })}
                placeholder="Login (opcional)"
                className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
              <input
                value={newEntry.password}
                onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })}
                placeholder="Senha"
                className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
              <input
                value={newEntry.url}
                onChange={(e) => setNewEntry({ ...newEntry, url: e.target.value })}
                placeholder="URL (opcional)"
                className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent sm:col-span-2"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={link}
              disabled={
                saving ||
                (mode === "existing"
                  ? available.length === 0
                  : !newEntry.name.trim() || !newEntry.password)
              }
            >
              Vincular
            </Button>
            <Button type="button" variant="secondary" onClick={() => setLinking(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setLinking(true)}
          className="self-start"
        >
          <Plus size={14} />
          Vincular credencial
        </Button>
      )}

      <ErrorNote message={error} />
    </div>
  );
}
