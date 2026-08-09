"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { Card, Button } from "@/components/ui";

type QuarterReviewData = {
  id: string;
  highlights: string | null;
  improvements: string | null;
  nextQuarterGoal: string | null;
};

export function QuarterReviewForm({ review }: { review: QuarterReviewData }) {
  const [form, setForm] = useState(review);
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function saveDebounced(patch: Partial<QuarterReviewData>) {
    setForm((prev) => ({ ...prev, ...patch }));
    setSaved(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetch(`/api/quarter-reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    }, 700);
  }

  async function handleSaveAll() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await fetch(`/api/quarter-reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaved(true);
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
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
          Meta do próximo trimestre
        </p>
        <textarea
          value={form.nextQuarterGoal ?? ""}
          onChange={(e) => saveDebounced({ nextQuarterGoal: e.target.value })}
          className="min-h-[120px] resize-none rounded-lg border border-border p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </Card>

      <div className="flex items-center justify-end gap-2">
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
