"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, ErrorNote, SaveStatus, useSaveStatus } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

type QuarterReviewData = {
  id: string;
  highlights: string | null;
  improvements: string | null;
  nextQuarterGoal: string | null;
};

export function QuarterReviewForm({ review }: { review: QuarterReviewData }) {
  const router = useRouter();
  const [form, setForm] = useState(review);
  const { state: saveState, track } = useSaveStatus();
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function persist(patch: Partial<QuarterReviewData>) {
    try {
      await track(api.patch(`/api/quarter-reviews/${review.id}`, patch));
      setError(null);
      router.refresh();
      return true;
    } catch (e) {
      // O texto digitado continua na tela — só o aviso muda.
      setError(errorMessage(e));
      return false;
    }
  }

  function saveDebounced(patch: Partial<QuarterReviewData>) {
    setForm((prev) => ({ ...prev, ...patch }));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      void persist(patch);
    }, 700);
  }

  async function handleSaveAll() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await persist(form);
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
        <ErrorNote message={error} />
        <SaveStatus state={saveState} />
        <Button type="button" onClick={handleSaveAll}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
