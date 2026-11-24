"use client";

import { Field, fieldClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import { cycleFlowLabels, cycleMoodLabels, cycleSymptomLabels } from "@/lib/labels";

export type CycleLogFormValue = {
  flow: string | null;
  symptoms: string[];
  mood: string | null;
  notes: string;
};

const flowOptions = Object.keys(cycleFlowLabels);
const moodOptions = Object.keys(cycleMoodLabels);
const symptomOptions = Object.keys(cycleSymptomLabels);

/**
 * Os campos do registro do dia — fluxo, sintomas, humor, notas — sem casca de
 * modal nem botão de salvar. TodayLogCard usa direto na tela; DayLogModal
 * embrulha em `Modal` para editar um dia qualquer do calendário.
 */
export function CycleLogFields({
  value,
  onChange,
}: {
  value: CycleLogFormValue;
  onChange: (next: CycleLogFormValue) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Fluxo">
        <div className="flex flex-wrap gap-1.5">
          {flowOptions.map((option) => {
            const selected = value.flow === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onChange({ ...value, flow: selected ? null : option })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  selected
                    ? "bg-danger-solid-bg text-danger-solid-text"
                    : "border border-border text-text-secondary hover:bg-hover",
                )}
              >
                {cycleFlowLabels[option]}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Sintomas">
        <div className="flex flex-wrap gap-1.5">
          {symptomOptions.map((option) => {
            const selected = value.symptoms.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    symptoms: selected
                      ? value.symptoms.filter((s) => s !== option)
                      : [...value.symptoms, option],
                  })
                }
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  selected
                    ? "bg-accent text-accent-contrast"
                    : "border border-border text-text-secondary hover:bg-hover",
                )}
              >
                {cycleSymptomLabels[option]}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Humor">
        <select
          value={value.mood ?? ""}
          onChange={(e) => onChange({ ...value, mood: e.target.value || null })}
          className={fieldClass}
        >
          <option value="">Não registrado</option>
          {moodOptions.map((option) => (
            <option key={option} value={option}>
              {cycleMoodLabels[option]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Notas (opcional)">
        <textarea
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          rows={2}
          className={fieldClass}
        />
      </Field>
    </div>
  );
}
