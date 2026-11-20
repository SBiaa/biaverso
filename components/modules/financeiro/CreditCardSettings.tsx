"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  Button,
  ErrorNote,
  Field,
  fieldClass,
  Modal,
  ModalActions,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

type Card = {
  name: string;
  closingDay: number | null;
  dueDay: number;
};

export function CreditCardSettings({ card }: { card: Card | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);

    try {
      await api.put("/api/credit-card", {
        name: form.name,
        closingDay: form.closingDay ? Number(form.closingDay) : null,
        dueDay: Number(form.dueDay),
      });
      setOpen(false);
      router.refresh();
      notify("Salvo.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Pencil size={14} />
        {card ? "Editar cartão" : "Configurar vencimento"}
      </Button>
      {open && (
        <Modal
          title={card ? "Editar cartão" : "Configurar cartão"}
          onClose={() => setOpen(false)}
          onSubmit={handleSubmit}
        >
          <Field label="Nome do cartão">
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={fieldClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dia do vencimento">
              <input
                type="number"
                min={1}
                max={31}
                value={form.dueDay}
                onChange={(e) => update("dueDay", e.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Dia do fechamento (opcional)">
              <input
                type="number"
                min={1}
                max={31}
                value={form.closingDay}
                onChange={(e) => update("closingDay", e.target.value)}
                className={fieldClass}
              />
            </Field>
          </div>
          <p className="text-xs text-text-secondary">
            O fechamento é usado só para adivinhar em qual fatura uma compra nova
            entra.
          </p>
          <ErrorNote message={error} />
          <ModalActions>
            <Button type="submit" disabled={saving || !form.dueDay}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </ModalActions>
        </Modal>
      )}
    </>
  );
}
