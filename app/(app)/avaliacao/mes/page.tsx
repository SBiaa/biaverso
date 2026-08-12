import Link from "next/link";
import { getOrCreateMonthReview, getQuarter } from "@/lib/avaliacao";
import { prisma } from "@/lib/prisma";
import { formatDateBR, parseIntParam, todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Card, MonthPicker } from "@/components/ui";
import { AvaliacaoSubNav } from "@/components/modules/avaliacao/AvaliacaoSubNav";
import { MonthReviewForm } from "@/components/modules/avaliacao/MonthReviewForm";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string; year?: string }>;

export default async function AvaliacaoMesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = todayUtc();
  const month = parseIntParam(params.month, 1, 12) ?? today.getUTCMonth() + 1;
  const year = parseIntParam(params.year, 1970, 2999) ?? today.getUTCFullYear();

  const review = await getOrCreateMonthReview(month, year);
  const weeks = await prisma.weekReview.findMany({
    where: { monthReviewId: review.id },
    orderBy: { weekStart: "asc" },
  });

  const quarterHref = `/avaliacao/trimestre?quarter=${getQuarter(month)}&year=${year}`;

  return (
    <>
      <Topbar width="narrow" title="Avaliação" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <AvaliacaoSubNav />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthPicker month={month} year={year} />
          <Link href={quarterHref} className="text-xs font-medium text-accent">
            Ver trimestre
          </Link>
        </div>

        <Card>
          <h2 className="mb-3 text-base font-semibold text-text-primary">
            Semanas do mês
          </h2>
          {weeks.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhuma semana avaliada ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {weeks.map((week) => (
                <li key={week.id}>
                  <Link
                    href={`/avaliacao/semana?week=${week.weekStart.toISOString().slice(0, 10)}`}
                    className="flex items-center justify-between text-sm text-accent hover:underline"
                  >
                    <span>
                      {formatDateBR(week.weekStart)} – {formatDateBR(week.weekEnd)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <MonthReviewForm review={review} />
      </main>
    </>
  );
}
