"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Link2Off, Lock, Pencil, Plus, User } from "lucide-react";
import { Button, ErrorNote, IconButton } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { passwordCategoryLabels } from "@/lib/labels";
import {
  PasswordFields,
  emptyPasswordForm,
  isPasswordFormValid,
  passwordFormPayload,
  type PasswordForm,
} from "@/components/modules/senhas/PasswordFields";

export type LinkedCredential = {
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

/**
 * Credenciais vinculadas a um projeto ou a um negócio — só o vínculo mora lá,
 * a senha continua sendo do cofre. Editar aqui altera a senha no cofre também:
 * é o mesmo registro, e uma cópia por lugar sairia do ar assim que ela trocasse
 * a senha num deles.
 *
 * As rotas de API nunca devolvem o campo `password`: o valor chega pelo render
 * do servidor, igual à tela de Senhas, e a lista é recarregada com
 * `router.refresh()` depois de vincular ou editar.
 */
export function CredentialsPanel({
  endpoint,
  initialCredentials,
  passwordOptions,
  emptyLabel = "Nenhuma credencial vinculada.",
  unlinkLabel = "Desvincular",
}: {
  /** Rota das credenciais, ex: `/api/projects/123/credentials`. */
  endpoint: string;
  initialCredentials: LinkedCredential[];
  passwordOptions: PasswordOption[];
  emptyLabel?: string;
  unlinkLabel?: string;
}) {
  const router = useRouter();
  const [credentials, setCredentials] = useState(initialCredentials);
  const [linking, setLinking] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedId, setSelectedId] = useState(passwordOptions[0]?.id ?? "");
  const [newEntry, setNewEntry] = useState(emptyPasswordForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PasswordForm>(emptyPasswordForm);
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
        const created = await api.post<{ id: string }>(
          "/api/passwords",
          passwordFormPayload(newEntry),
        );
        passwordEntryId = created.id;
      }

      await api.post(endpoint, { passwordEntryId });
      setLinking(false);
      setNewEntry(emptyPasswordForm);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function startEditing(entry: LinkedCredential["passwordEntry"]) {
    setEditForm({
      name: entry.name,
      login: entry.login ?? "",
      password: entry.password,
      url: entry.url ?? "",
      category: entry.category,
    });
    setError(null);
    setEditingId(entry.id);
  }

  async function saveEdit(entryId: string) {
    if (!isPasswordFormValid(editForm)) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/passwords/${entryId}`, passwordFormPayload(editForm));
      setEditingId(null);
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
      await api.delete(`${endpoint}/${id}`);
    } catch (e) {
      setCredentials(previous);
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {credentials.length === 0 && !linking && (
        <p className="text-sm text-text-secondary">{emptyLabel}</p>
      )}

      <ul className="flex flex-col gap-2">
        {credentials.map(({ id, passwordEntry: entry }) => (
          <li key={id} className="rounded-lg border border-border p-3">
            {editingId === entry.id ? (
              <div className="flex flex-col gap-2">
                <PasswordFields form={editForm} onChange={setEditForm} />
                <p className="text-xs text-text-secondary">
                  A alteração vale para o cofre inteiro — é a mesma senha em todo lugar
                  onde ela está vinculada.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => saveEdit(entry.id)}
                    disabled={saving || !isPasswordFormValid(editForm)}
                  >
                    Salvar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
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
                      className="rounded-md p-1.5 text-text-secondary hover:bg-hover hover:text-text-primary"
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
                    className="rounded-md p-1.5 text-text-secondary hover:bg-hover hover:text-text-primary"
                  >
                    {copied === `${id}-pass` ? (
                      <Check size={14} className="text-emerald-600" />
                    ) : (
                      <Lock size={14} />
                    )}
                  </button>
                  <IconButton
                    title="Editar senha"
                    onClick={() => startEditing(entry)}
                  >
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    title={unlinkLabel}
                    onClick={() => unlink(id)}
                    tone="danger"
                  >
                    <Link2Off size={15} />
                  </IconButton>
                </div>
              </div>
            )}
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
                Todas as senhas do cofre já estão vinculadas aqui.
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
            <PasswordFields form={newEntry} onChange={setNewEntry} />
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={link}
              disabled={
                saving ||
                (mode === "existing"
                  ? available.length === 0
                  : !isPasswordFormValid(newEntry))
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
