"use client";

import { startTransition, useOptimistic, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

/**
 * "Já preenchi este dia." Só dia conferido entra nas avaliações de hábitos e
 * casa: antes disso, o que está desmarcado pode ser só esquecimento.
 */
export function DayReviewToggle({
  dayId,
  reviewed: serverReviewed,
}: {
  dayId: string;
  reviewed: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [reviewed, setOptimistic] = useOptimistic(serverReviewed);

  function toggle() {
    const next = !reviewed;
    startTransition(async () => {
      setOptimistic(next);
      setError(null);
      try {
        await api.patch(`/api/dias/${dayId}`, { reviewed: next });
        router.refresh();
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant={reviewed ? "secondary" : "primary"}
        onClick={toggle}
        aria-pressed={reviewed}
      >
        {reviewed ? (
          <>
            <CheckCircle2 size={16} className="text-accent-ink" /> Dia conferido
          </>
        ) : (
          <>
            <Circle size={16} /> Conferir dia
          </>
        )}
      </Button>
      <p className="text-xs text-text-secondary">
        {reviewed
          ? "Hábitos e casa deste dia entram nas avaliações."
          : "Marque quando terminar de preencher. Até lá, este dia fica fora das avaliações."}
      </p>
      <ErrorNote message={error} />
    </div>
  );
}
