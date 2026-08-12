import Link from "next/link";
import { getOrCreateQuarterReview } from "@/lib/avaliacao";
import { prisma } from "@/lib/prisma";
import { formatMonthYearBR, parseIntParam, todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { AvaliacaoSubNav } from "@/components/modules/avaliacao/AvaliacaoSubNav";
import { QuarterPicker } from "@/components/modules/avaliacao/QuarterPicker";
import { QuarterReviewForm } from "@/components/modules/avaliacao/QuarterReviewForm";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ quarter?: string; year?: string }>;

export default async function AvaliacaoTrimestrePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = todayUtc();
  const quarter =
    parseIntParam(params.quarter, 1, 4) ?? Math.ceil((today.getUTCMonth() + 1) / 3);
  const year = parseIntParam(params.year, 1970, 2999) ?? today.getUTCFullYear();

  const review = await getOrCreateQuarterReview(quarter, year);
  const months = await prisma.monthReview.findMany({
    where: { quarterReviewId: review.id },
    orderBy: { month: "asc" },
  });

  return (
    <>
      <Topbar width="narrow" title="Avaliação" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <AvaliacaoSubNav />

        <QuarterPicker quarter={quarter} year={year} />

        <Card>
          <h2 className="mb-3 text-base font-semibold text-text-primary">
            Meses do trimestre
          </h2>
          {months.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhum mês avaliado ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {months.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/avaliacao/mes?month=${m.month}&year=${m.year}`}
                    className="text-sm text-accent hover:underline"
                  >
                    {formatMonthYearBR(m.month, m.year)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <QuarterReviewForm review={review} />
      </main>
    </>
  );
}
