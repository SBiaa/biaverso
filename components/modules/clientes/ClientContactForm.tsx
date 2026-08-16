"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button, CardTitle, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  notes: string | null;
};

/** Dados de contato do cliente — leitura por padrão, edição no botão. */
export function ClientContactForm({ client }: { client: Client }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    instagram: client.instagram ?? "",
    notes: client.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/clients/${client.id}`, form);
      setEditing(false);
      router.refresh();
      notify("Salvo.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <CardTitle>Contato</CardTitle>
          <Button
            variant="ghost"
            onClick={() => setEditing(true)}
            className="px-2 py-1 text-xs"
          >
            <Pencil size={13} />
            Editar
          </Button>
        </div>
        <p className="text-sm text-text-secondary">E-mail: {client.email ?? "—"}</p>
        <p className="text-sm text-text-secondary">Telefone: {client.phone ?? "—"}</p>
        <p className="text-sm text-text-secondary">
          Instagram: {client.instagram ?? "—"}
        </p>
        {client.notes && (
          <p className="text-sm text-text-secondary">Notas: {client.notes}</p>
        )}
      </div>
    );
  }

  const inputClass =
    "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

  return (
    <div className="flex flex-col gap-2">
      <CardTitle>Contato</CardTitle>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Nome"
          className={inputClass}
        />
        <input
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="E-mail"
          className={inputClass}
        />
        <input
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="Telefone"
          className={inputClass}
        />
        <input
          value={form.instagram}
          onChange={(e) => update("instagram", e.target.value)}
          placeholder="Instagram"
          className={inputClass}
        />
      </div>

      <input
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
        placeholder="Notas"
        className={inputClass}
      />

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving || !form.name.trim()}>
          Salvar
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setEditing(false);
            setForm({
              name: client.name,
              email: client.email ?? "",
              phone: client.phone ?? "",
              instagram: client.instagram ?? "",
              notes: client.notes ?? "",
            });
          }}
        >
          Cancelar
        </Button>
      </div>

      <ErrorNote message={error} />
    </div>
  );
}
