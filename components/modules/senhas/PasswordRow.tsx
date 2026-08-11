"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Lock, Pencil, Trash2, User } from "lucide-react";
import { Button, Card, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import {
  PasswordFields,
  isPasswordFormValid,
  passwordFormPayload,
  type PasswordForm,
} from "@/components/modules/senhas/PasswordFields";

type PasswordRowProps = {
  id: string;
  name: string;
  login: string | null;
  password: string;
  url: string | null;
  category: string;
};

export function PasswordRow({ id, name, login, password, url, category }: PasswordRowProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState<"login" | "password" | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PasswordForm>({
    name,
    login: login ?? "",
    password,
    url: url ?? "",
    category,
  });

  async function handleCopy(value: string, type: "login" | "password") {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  function startEditing() {
    // Recarrega do que está salvo: cancelar e reabrir não pode trazer rascunho.
    setForm({ name, login: login ?? "", password, url: url ?? "", category });
    setError(null);
    setEditing(true);
  }

  async function save() {
    if (!isPasswordFormValid(form)) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/passwords/${id}`, passwordFormPayload(form));
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Apagar a senha "${name}"? Isso não tem como desfazer.`)) return;
    setSaving(true);
    setError(null);
    try {
      await api.delete(`/api/passwords/${id}`);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <Card className="flex flex-col gap-2">
        <ErrorNote message={error} />
        <PasswordFields form={form} onChange={setForm} />
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || !isPasswordFormValid(form)}>
            Salvar
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">{name}</p>
          {login && <p className="text-xs text-text-secondary">{login}</p>}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-text-secondary">
              {visible ? password : "•".repeat(Math.max(password.length, 8))}
            </span>
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
              className="text-text-secondary hover:text-text-primary"
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-accent"
            >
              {url}
            </a>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {login && (
            <button
              type="button"
              title="Copiar login"
              onClick={() => handleCopy(login, "login")}
              className="rounded-md p-1.5 text-text-secondary hover:bg-black/[0.03] hover:text-text-primary"
            >
              {copied === "login" ? (
                <Check size={14} className="text-emerald-600" />
              ) : (
                <User size={14} />
              )}
            </button>
          )}
          <button
            type="button"
            title="Copiar senha"
            onClick={() => handleCopy(password, "password")}
            className="rounded-md p-1.5 text-text-secondary hover:bg-black/[0.03] hover:text-text-primary"
          >
            {copied === "password" ? (
              <Check size={14} className="text-emerald-600" />
            ) : (
              <Lock size={14} />
            )}
          </button>
          <button
            type="button"
            title="Editar"
            onClick={startEditing}
            className="rounded-md p-1.5 text-text-secondary hover:bg-black/[0.03] hover:text-text-primary"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            title="Apagar"
            onClick={remove}
            disabled={saving}
            className="rounded-md p-1.5 text-text-secondary hover:bg-black/[0.03] hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <ErrorNote message={error} />
    </Card>
  );
}
