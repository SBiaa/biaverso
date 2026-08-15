"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { addUtcDays, toDateInputValue } from "@/lib/utils";
import { currentWeekStartISO, formatWeekRange } from "@/lib/cardapio";

export function WeekPicker({
  weekStart,
  isCurrentWeek,
}: {
  weekStart: string;
  isCurrentWeek: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function push(week: string | null) {
    // O filtro da biblioteca mora na mesma URL: trocar de semana não pode
    // apagar a categoria que ela escolheu lá embaixo.
    const params = new URLSearchParams(searchParams.toString());
    if (week) params.set("semana", week);
    else params.delete("semana");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function go(deltaWeeks: number) {
    const next = addUtcDays(new Date(weekStart), deltaWeeks * 7);
    // Ao cair na semana de hoje a URL volta a ficar limpa — é isso que faz a
    // tela seguir o relógio de novo em vez de ficar presa numa data.
    push(
      next.toISOString() === currentWeekStartISO()
        ? null
        : toDateInputValue(next),
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          className="rounded-md border border-border p-1.5 hover:bg-black/[0.03]"
          aria-label="Semana anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => push(null)}
          className="text-sm font-semibold text-text-primary hover:text-accent"
        >
          Semana de {formatWeekRange(new Date(weekStart))}
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          className="rounded-md border border-border p-1.5 hover:bg-black/[0.03]"
          aria-label="Próxima semana"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {isCurrentWeek ? (
        <span className="text-xs text-text-secondary">
          Toda segunda a grade começa vazia.
        </span>
      ) : (
        <button
          type="button"
          onClick={() => push(null)}
          className="text-xs font-medium text-accent hover:underline"
        >
          voltar para esta semana
        </button>
      )}
    </div>
  );
}
