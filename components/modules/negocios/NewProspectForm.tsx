"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { leadSourceLabels } from "@/lib/labels";

const sourceOptions = Object.keys(leadSourceLabels);

/**
 * Cadastro rápido de um prospect novo neste negócio.
 *
 * Cria o cliente e já entra no quadro em "Novo contato" — quem já é cliente
 * de verdade entra pelo "+ Novo cliente" da lista abaixo, sem passar por aqui.
 */
export function NewProspectForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    instagram: "",
    source: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    try {
      await api.post("/api/clients", {
        ...form,
        source: form.source || null,
        businessId,
        status: "PROSPECT",
      });
      setOpen(false);
      setForm({ name: "", email: "", phone: "", instagram: "", source: "" });
      router.refresh();
      notify("Prospect adicionado.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + Novo prospect
      </Button>
    );
  }

  return (
    <Card className="flex flex-col gap-2">
      <ErrorNote message={error} />
      <input
        placeholder="Nome"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="flex gap-2">
        <input
          placeholder="E-mail (opcional)"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          placeholder="Telefone (opcional)"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <div className="flex gap-2">
        <input
          placeholder="Instagram (opcional)"
          value={form.instagram}
          onChange={(e) => update("instagram", e.target.value)}
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <select
          value={form.source}
          onChange={(e) => update("source", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Origem (opcional)</option>
          {sourceOptions.map((s) => (
            <option key={s} value={s}>
              {leadSourceLabels[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={saving}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
