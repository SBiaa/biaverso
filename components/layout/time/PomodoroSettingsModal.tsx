"use client";

import { useState } from "react";
import { Button, ErrorNote, Modal, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import type { PomodoroSettingsDTO } from "@/lib/time-tracking-shared";

const inputClass =
  "w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent";

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-text-primary">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputClass}
      />
      <span className="text-xs text-text-secondary">{hint}</span>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-text-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-accent"
      />
      {label}
    </label>
  );
}

export function PomodoroSettingsModal({
  settings,
  onClose,
  onSaved,
}: {
  settings: PomodoroSettingsDTO;
  onClose: () => void;
  onSaved: (settings: PomodoroSettingsDTO) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof PomodoroSettingsDTO>(key: K, value: PomodoroSettingsDTO[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const saved = await api.put<PomodoroSettingsDTO>("/api/pomodoro-settings", draft);
      onSaved(saved);
      notify("Pomodoro atualizado.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Configurar pomodoro" onClose={onClose} onSubmit={save}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Foco"
            hint="minutos"
            min={1}
            max={240}
            value={draft.focusMinutes}
            onChange={(v) => set("focusMinutes", v)}
          />
          <NumberField
            label="Pausa curta"
            hint="minutos"
            min={1}
            max={120}
            value={draft.shortBreakMinutes}
            onChange={(v) => set("shortBreakMinutes", v)}
          />
          <NumberField
            label="Pausa longa"
            hint="minutos"
            min={1}
            max={240}
            value={draft.longBreakMinutes}
            onChange={(v) => set("longBreakMinutes", v)}
          />
          <NumberField
            label="Pausa longa a cada"
            hint="ciclos de foco"
            min={1}
            max={12}
            value={draft.cyclesBeforeLongBreak}
            onChange={(v) => set("cyclesBeforeLongBreak", v)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Toggle
            label="Começar a pausa sozinho quando o foco acabar"
            checked={draft.autoStartBreaks}
            onChange={(v) => set("autoStartBreaks", v)}
          />
          <Toggle
            label="Começar o próximo foco sozinho quando a pausa acabar"
            checked={draft.autoStartFocus}
            onChange={(v) => set("autoStartFocus", v)}
          />
          <Toggle
            label="Tocar um aviso sonoro"
            checked={draft.sound}
            onChange={(v) => set("sound", v)}
          />
        </div>

        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
