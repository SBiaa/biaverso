"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { careTypeLabels } from "@/lib/labels";
import { toDateInputValue } from "@/lib/utils";
import type { AppointmentView } from "@/lib/beleza-shared";
import { Field, Modal, fieldClass } from "./shared";

const typeOptions = Object.keys(careTypeLabels);

export function AppointmentFormModal({
  appointment,
  onClose,
}: {
  /** Ausente = criando um cuidado novo. */
  appointment?: AppointmentView;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: appointment?.name ?? "",
    type: appointment?.type ?? "UNHAS",
    intervalDays: String(appointment?.intervalDays ?? 15),
    lastDoneAt: appointment?.lastDoneAt ? toDateInputValue(appointment.lastDoneAt) : "",
    notes: appointment?.notes ?? "",
    active: appointment?.active ?? true,
  });

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    const body = {
      name: form.name,
      type: form.type,
      intervalDays: Number(form.intervalDays) || 15,
      lastDoneAt: form.lastDoneAt || null,
      notes: form.notes || null,
      ...(appointment ? { active: form.active } : {}),
    };

    try {
      if (appointment) {
        await api.patch(`/api/beauty/appointments/${appointment.id}`, body);
      } else {
        await api.post("/api/beauty/appointments", body);
      }
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
      title={appointment ? "Editar cuidado" : "Novo cuidado"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <Field label="Nome">
      <input
        placeholder="Fazer as unhas"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        className={fieldClass}
      />
      </Field>

      <Field label="Tipo">
      <select
        value={form.type}
        onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
        className={fieldClass}
      >
        {typeOptions.map((t) => (
          <option key={t} value={t}>
            {careTypeLabels[t]}
          </option>
        ))}
      </select>
      </Field>

      <Field label="A cada quantos dias">
      <input
        type="number"
        min="1"
        max="365"
        value={form.intervalDays}
        onChange={(e) => setForm((prev) => ({ ...prev, intervalDays: e.target.value }))}
        className={fieldClass}
      />
      </Field>

      <Field label="Última vez que fez (opcional)">
      <input
        type="date"
        value={form.lastDoneAt}
        onChange={(e) => setForm((prev) => ({ ...prev, lastDoneAt: e.target.value }))}
        className={fieldClass}
      />
      <span className="text-xs text-text-secondary">
        Preenchendo aqui, a próxima data já sai calculada.
      </span>
      </Field>

      <Field label="Notas (opcional)">
      <input
        placeholder="Salão da esquina, esmalte vermelho"
        value={form.notes}
        onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
        className={fieldClass}
      />
      </Field>

      {appointment && (
      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Ativo
      </label>
      )}

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
