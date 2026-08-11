"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Card, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

type BusinessOption = { id: string; name: string; color: string };

const emptyForm = { name: "", email: "", phone: "", instagram: "", notes: "" };

/**
 * Cadastro de cliente do registro global. Diferente do form de dentro do
 * negócio, aqui os negócios são marcáveis e opcionais: dá para cadastrar
 * alguém que atende Ace e Creative de uma vez, ou ninguém ainda.
 */
export function NewClientForm({ businesses }: { businesses: BusinessOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleBusiness(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  }

  async function submit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    try {
      await api.post("/api/clients", { ...form, businessIds: selected });
      setForm(emptyForm);
      setSelected([]);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus size={14} />
        Novo cliente
      </Button>
    );
  }

  const inputClass =
    "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

  return (
    <Card className="flex w-full flex-col gap-3">
      <h2 className="text-sm font-semibold text-text-primary">Novo cliente</h2>

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
          placeholder="E-mail (opcional)"
          className={inputClass}
        />
        <input
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="Telefone (opcional)"
          className={inputClass}
        />
        <input
          value={form.instagram}
          onChange={(e) => update("instagram", e.target.value)}
          placeholder="Instagram (opcional)"
          className={inputClass}
        />
      </div>

      <input
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
        placeholder="Notas (opcional)"
        className={inputClass}
      />

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          Negócios deste cliente
        </span>
        <div className="flex flex-wrap gap-2">
          {businesses.map((b) => {
            const on = selected.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleBusiness(b.id)}
                aria-pressed={on}
                className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                style={
                  on
                    ? { backgroundColor: b.color, borderColor: b.color, color: "#fff" }
                    : { borderColor: "var(--border)", color: "var(--text-secondary)" }
                }
              >
                {b.name}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-text-secondary">
          Pode marcar mais de um, ou nenhum e vincular depois.
        </span>
      </div>

      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving || !form.name.trim()}>
          Salvar
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setOpen(false);
            setForm(emptyForm);
            setSelected([]);
          }}
        >
          Cancelar
        </Button>
      </div>

      <ErrorNote message={error} />
    </Card>
  );
}
