"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui";
import { StarRating } from "./StarRating";
import { starsValues } from "@/lib/labels";

type MonthReviewData = {
  id: string;
  effectiveness: string | null;
  highlights: string | null;
  improvements: string | null;
  nextMonthGoal: string | null;
};

export function MonthReviewForm({ review }: { review: MonthReviewData }) {
  const [form, setForm] = useState(review);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function save(patch: Partial<MonthReviewData>) {
    setForm((prev) => ({ ...prev, ...patch }));
    fetch(`/api/month-reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  function saveDebounced(patch: Partial<MonthReviewData>) {
    setForm((prev) => ({ ...prev, ...patch }));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetch(`/api/month-reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    }, 700);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="mb-2 text-base font-semibold text-text-primary">
          Efetividade
        </p>
        <StarRating
          value={form.effectiveness ? starsValues.indexOf(form.effectiveness) + 1 : 0}
          onChange={(n) => save({ effectiveness: starsValues[n - 1] })}
        />
      </Card>

      <Card className="flex flex-col gap-2">
        <p className="text-base font-semibold text-text-primary">Destaques</p>
        <textarea
          value={form.highlights ?? ""}
          onChange={(e) => saveDebounced({ highlights: e.target.value })}
          className="min-h-[120px] resize-none rounded-lg border border-border p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </Card>

      <Card className="flex flex-col gap-2">
        <p className="text-base font-semibold text-text-primary">Melhorias</p>
        <textarea
          value={form.improvements ?? ""}
          onChange={(e) => saveDebounced({ improvements: e.target.value })}
          className="min-h-[120px] resize-none rounded-lg border border-border p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </Card>

      <Card className="flex flex-col gap-2">
        <p className="text-base font-semibold text-text-primary">
          Meta do próximo mês
        </p>
        <textarea
          value={form.nextMonthGoal ?? ""}
          onChange={(e) => saveDebounced({ nextMonthGoal: e.target.value })}
          className="min-h-[120px] resize-none rounded-lg border border-border p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </Card>
    </div>
  );
}
