"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui";
import { StarRating } from "./StarRating";
import { cn } from "@/lib/utils";
import {
  blockLabels,
  energyLabels,
  executionLabels,
  qualityLabels,
  starsValues,
} from "@/lib/labels";

type WeekReviewData = {
  id: string;
  effectiveness: string | null;
  energy: string | null;
  biggestBlock: string | null;
  executedPlan: string | null;
  foodHydration: string | null;
  houseUpToDate: boolean;
  notes: string | null;
  nextWeekFocus: string | null;
};

function ButtonGroup({
  options,
  value,
  onChange,
}: {
  options: Record<string, string>;
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          onClick={() => onChange(optionValue)}
          className={cn(
            "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
            value === optionValue
              ? "border-accent bg-accent/10 text-accent"
              : "border-border text-text-secondary hover:bg-black/[0.03]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function WeekReviewForm({ review }: { review: WeekReviewData }) {
  const [form, setForm] = useState(review);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function save(patch: Partial<WeekReviewData>) {
    setForm((prev) => ({ ...prev, ...patch }));
    fetch(`/api/week-reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  function saveDebounced(patch: Partial<WeekReviewData>) {
    setForm((prev) => ({ ...prev, ...patch }));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetch(`/api/week-reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    }, 700);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col divide-y divide-border">
        <div className="pb-4">
          <p className="mb-2 text-base font-semibold text-text-primary">
            Efetividade
          </p>
          <StarRating
            value={form.effectiveness ? starsValues.indexOf(form.effectiveness) + 1 : 0}
            onChange={(n) => save({ effectiveness: starsValues[n - 1] })}
          />
        </div>

        <div className="py-4">
          <p className="mb-2 text-base font-semibold text-text-primary">Energia</p>
          <ButtonGroup
            options={energyLabels}
            value={form.energy}
            onChange={(value) => save({ energy: value })}
          />
        </div>

        <div className="py-4">
          <p className="mb-2 text-base font-semibold text-text-primary">
            Maior trava
          </p>
          <ButtonGroup
            options={blockLabels}
            value={form.biggestBlock}
            onChange={(value) => save({ biggestBlock: value })}
          />
        </div>

        <div className="py-4">
          <p className="mb-2 text-base font-semibold text-text-primary">
            Executei o planejado
          </p>
          <ButtonGroup
            options={executionLabels}
            value={form.executedPlan}
            onChange={(value) => save({ executedPlan: value })}
          />
        </div>

        <div className="py-4">
          <p className="mb-2 text-base font-semibold text-text-primary">
            Alimentação/hidratação
          </p>
          <ButtonGroup
            options={qualityLabels}
            value={form.foodHydration}
            onChange={(value) => save({ foodHydration: value })}
          />
        </div>

        <label className="flex items-center gap-2 pt-4 text-sm">
          <input
            type="checkbox"
            checked={form.houseUpToDate}
            onChange={(e) => save({ houseUpToDate: e.target.checked })}
            className="h-4 w-4 accent-accent"
          />
          <span className="text-text-primary">Casa em dia</span>
        </label>
      </Card>

      <Card className="flex flex-col gap-2">
        <p className="text-base font-semibold text-text-primary">Notas</p>
        <textarea
          value={form.notes ?? ""}
          onChange={(e) => saveDebounced({ notes: e.target.value })}
          placeholder="Como foi a semana?"
          className="min-h-[120px] resize-none rounded-lg border border-border p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </Card>

      <Card className="flex flex-col gap-2">
        <p className="text-base font-semibold text-text-primary">
          Foco da próxima semana
        </p>
        <textarea
          value={form.nextWeekFocus ?? ""}
          onChange={(e) => saveDebounced({ nextWeekFocus: e.target.value })}
          className="min-h-[120px] resize-none rounded-lg border border-border p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </Card>
    </div>
  );
}
