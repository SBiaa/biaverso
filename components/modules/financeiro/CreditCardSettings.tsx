"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui";

type Card = {
  name: string;
  closingDay: number | null;
  dueDay: number;
};

export function CreditCardSettings({ card }: { card: Card | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: card?.name ?? "Cartão de crédito",
    closingDay: card?.closingDay ? String(card.closingDay) : "",
    dueDay: card ? String(card.dueDay) : "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.dueDay) return;
    setSaving(true);
    await fetch("/api/credit-card", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        closingDay: form.closingDay ? Number(form.closingDay) : null,
        dueDay: Number(form.dueDay),
      }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Pencil size={14} />
        {card ? "Editar cartão" : "Configurar vencimento"}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <input
        placeholder="Nome do cartão"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-text-secondary">Dia do vencimento</span>
          <input
            type="number"
            min={1}
            max={31}
            value={form.dueDay}
            onChange={(e) => update("dueDay", e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-text-secondary">
            Dia do fechamento (opcional)
          </span>
          <input
            type="number"
            min={1}
            max={31}
            value={form.closingDay}
            onChange={(e) => update("closingDay", e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
      </div>
      <p className="text-xs text-text-secondary">
        O fechamento é usado só para adivinhar em qual fatura uma compra nova
        entra.
      </p>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={saving}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
