"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

type AddClientFormProps = {
  businessId: string;
};

export function AddClientForm({ businessId }: AddClientFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    instagram: "",
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, businessId }),
    });
    setSaving(false);
    setOpen(false);
    setForm({ name: "", email: "", phone: "", instagram: "", notes: "" });
    router.refresh();
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Novo cliente</Button>;
  }

  return (
    <Card className="flex flex-col gap-2">
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
      <input
        placeholder="Instagram (opcional)"
        value={form.instagram}
        onChange={(e) => update("instagram", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        placeholder="Notas (opcional)"
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
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
