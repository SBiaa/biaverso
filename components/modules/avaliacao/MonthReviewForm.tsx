"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { Card, Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
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
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function persist(patch: Partial<MonthReviewData>) {
    try {
      await api.patch(`/api/month-reviews/${review.id}`, patch);
      setError(null);
    } catch (e) {
      // O texto digitado continua na tela — só o aviso muda.
      setError(errorMessage(e));
    }
  }

  function save(patch: Partial<MonthReviewData>) {
    setForm((prev) => ({ ...prev, ...patch }));
    setSaved(false);
    void persist(patch);
  }

  function saveDebounced(patch: Partial<MonthReviewData>) {
    setForm((prev) => ({ ...prev, ...patch }));
    setSaved(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      void persist(patch);
    }, 700);
  }

  async function handleSaveAll() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await persist(form);
    if (error) return;
    setSaved(true);
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => setSaved(false), 2000);
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

      <div className="flex items-center justify-end gap-2">
        <ErrorNote message={error} />
        {saved && (
          <span className="flex items-center gap-1 text-xs text-accent">
            <Check size={14} /> Salvo
          </span>
        )}
        <Button type="button" onClick={handleSaveAll}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
