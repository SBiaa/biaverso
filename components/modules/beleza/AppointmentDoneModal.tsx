"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { todayInputValue } from "@/lib/utils";
import { Field, Modal, fieldClass } from "./shared";

/**
 * "Marcar como feito" de um cuidado: data, custo e notas. Com custo preenchido,
 * oferece lançar a saída no financeiro — é opt-in, ninguém mexe no caixa sem pedir.
 */
export function AppointmentDoneModal({
  appointmentId,
  name,
  onClose,
}: {
  appointmentId: string;
  name: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: todayInputValue(),
    cost: "",
    notes: "",
    createTransaction: false,
  });

  const hasCost = Number(form.cost) > 0;

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/beauty/appointments/${appointmentId}/log`, {
        date: form.date,
        cost: hasCost ? Number(form.cost) : null,
        notes: form.notes || null,
        createTransaction: hasCost && form.createTransaction,
      });
      router.refresh();
      notify("Salvo.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Marcar "${name}" como feito`}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <Field label="Quando foi">
      <input
        type="date"
        value={form.date}
        onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
        className={fieldClass}
      />
      </Field>

      <Field label="Quanto custou (opcional)">
      <input
        type="number"
        step="0.01"
        min="0"
        placeholder="0,00"
        value={form.cost}
        onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
        className={fieldClass}
      />
      </Field>

      {hasCost && (
      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={form.createTransaction}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, createTransaction: e.target.checked }))
          }
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Lançar no financeiro como saída de beleza
      </label>
      )}

      <Field label="Notas (opcional)">
      <input
        placeholder="Onde foi, o que fez..."
        value={form.notes}
        onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
        className={fieldClass}
      />
      </Field>

      <ErrorNote message={error} />

      <div className="mt-2 flex gap-2">
      <Button type="submit" disabled={saving}>
        Salvar
      </Button>
      <Button variant="ghost" onClick={onClose}>
        Cancelar
      </Button>
      </div>
    </Modal>
  );
}
