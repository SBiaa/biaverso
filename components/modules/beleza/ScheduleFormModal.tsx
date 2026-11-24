"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import type { ScheduleView } from "@/lib/beleza-shared";
import { Field, Modal, fieldClass } from "./shared";

export function ScheduleFormModal({
  schedule,
  onClose,
}: {
  /** Ausente = criando um cronograma novo. */
  schedule?: ScheduleView;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: schedule?.name ?? "",
    description: schedule?.description ?? "",
    active: schedule?.active ?? true,
  });

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    const body = {
      name: form.name,
      description: form.description || null,
      ...(schedule ? { active: form.active } : {}),
    };

    try {
      if (schedule) {
        await api.patch(`/api/beauty/schedules/${schedule.id}`, body);
      } else {
        await api.post("/api/beauty/schedules", body);
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
      title={schedule ? "Editar cronograma" : "Novo cronograma"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <Field label="Nome">
      <input
        placeholder="Cronograma capilar"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        className={fieldClass}
      />
      </Field>

      <Field label="Descrição (opcional)">
      <input
        placeholder="Hidratação, nutrição e reconstrução"
        value={form.description}
        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        className={fieldClass}
      />
      </Field>

      {schedule && (
      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Ativo (aparece na tela de hoje)
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
