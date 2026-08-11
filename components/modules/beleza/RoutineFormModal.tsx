"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { routineTimeLabels } from "@/lib/labels";
import type { RoutineView } from "@/lib/beleza-shared";
import { Field, Modal, fieldClass } from "./shared";

const timeOptions = Object.keys(routineTimeLabels);

export function RoutineFormModal({
  routine,
  onClose,
}: {
  /** Ausente = criando uma rotina nova. */
  routine?: RoutineView;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: routine?.name ?? "",
    timeOfDay: routine?.timeOfDay ?? "MANHA",
    active: routine?.active ?? true,
  });

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (routine) {
        await api.patch(`/api/beauty/routines/${routine.id}`, form);
      } else {
        await api.post("/api/beauty/routines", {
          name: form.name,
          timeOfDay: form.timeOfDay,
        });
      }
      router.refresh();
      onClose();
    } catch (e) {
      // O modal fica aberto com o que foi digitado, para não perder o texto.
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={routine ? "Editar rotina" : "Nova rotina"} onClose={onClose}>
      <Field label="Nome">
        <input
          placeholder="Skincare manhã"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          className={fieldClass}
        />
      </Field>

      <Field label="Período">
        <select
          value={form.timeOfDay}
          onChange={(e) => setForm((prev) => ({ ...prev, timeOfDay: e.target.value }))}
          className={fieldClass}
        >
          {timeOptions.map((t) => (
            <option key={t} value={t}>
              {routineTimeLabels[t]}
            </option>
          ))}
        </select>
      </Field>

      {routine && (
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Ativa (aparece no dia)
        </label>
      )}

      <ErrorNote message={error} />

      <div className="mt-2 flex gap-2">
        <Button onClick={handleSubmit} disabled={saving}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
