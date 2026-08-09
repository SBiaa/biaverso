import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import {
  getRecentWeekReviews,
  getHabitMonthStats,
  getBiggestBlockStats,
  getOrCreateMonthReview,
} from "@/lib/avaliacao";
import { startOfToday, formatMonthYearBR } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { AvaliacaoSubNav } from "@/components/modules/avaliacao/AvaliacaoSubNav";
import { EffectivenessTimeline } from "@/components/modules/avaliacao/EffectivenessTimeline";
import { HabitProgressList } from "@/components/modules/avaliacao/HabitProgressList";
import { BiggestBlocksSummary } from "@/components/modules/avaliacao/BiggestBlocksSummary";

export const dynamic = "force-dynamic";

export default async function AvaliacaoDashboardPage() {
  const today = startOfToday();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const [recentWeeks, habitMonthStats, blockStats, monthReview] = await Promise.all([
    getRecentWeekReviews(12),
    getHabitMonthStats(today),
    getBiggestBlockStats(8),
    getOrCreateMonthReview(month, year),
  ]);

  const avaliarButton = (
    <Link
      href="/avaliacao/semana/nova"
      className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
    >
      <CalendarPlus size={16} />
      Avaliar esta semana
    </Link>
  );

  return (
    <>
      <Topbar title="Avaliação" action={avaliarButton} />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <AvaliacaoSubNav />

        <div className="md:hidden">{avaliarButton}</div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 text-base font-semibold text-text-primary">
              Efetividade das últimas semanas
            </h2>
            <EffectivenessTimeline weeks={recentWeeks} />
          </Card>

          <Card>
            <h2 className="mb-3 text-base font-semibold text-text-primary">
              Hábitos do mês
            </h2>
            <HabitProgressList items={habitMonthStats} />
          </Card>

          <Card>
            <h2 className="mb-3 text-base font-semibold text-text-primary">
              Maiores travas (últimas 8 semanas)
            </h2>
            <BiggestBlocksSummary stats={blockStats} />
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">
                Resumo de {formatMonthYearBR(month, year)}
              </h2>
              <Link
                href={`/avaliacao/mes?month=${month}&year=${year}`}
                className="text-xs font-medium text-accent"
              >
                Editar mês
              </Link>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Destaques</p>
              <p className="text-sm text-text-primary">
                {monthReview.highlights || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Melhorias</p>
              <p className="text-sm text-text-primary">
                {monthReview.improvements || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">
                Meta do mês
              </p>
              <p className="text-sm text-text-primary">
                {monthReview.nextMonthGoal || "—"}
              </p>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
