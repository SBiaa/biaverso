import { Topbar } from "@/components/layout/Topbar";
import { itemGrid } from "@/components/layout/page-width";
import { EspiritualSubNav } from "@/components/modules/espiritual/EspiritualSubNav";
import { StudyForm } from "@/components/modules/espiritual/StudyForm";
import { StudyCard } from "@/components/modules/espiritual/StudyCard";
import { StudyFilters } from "@/components/modules/espiritual/StudyFilters";
import { getMeetingOptions, getStudies } from "@/lib/espiritual";
import { OPEN_STUDY_STATUS } from "@/lib/espiritual-shared";
import { StudyStatus } from "@/app/generated/prisma/enums";
import { toDateInputValue, todayUtc } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

export default async function EstudosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = todayUtc();

  // "ABERTOS" é o padrão da tela e não é um status do banco: é o corte de tudo
  // que ainda não foi entregue. "TODOS" tira o corte. Param inventado na URL
  // volta para o padrão em vez de virar consulta quebrada.
  const requested = params.status ?? "ABERTOS";
  const status =
    requested in StudyStatus || requested === "TODOS" ? requested : "ABERTOS";

  const [studies, meetings] = await Promise.all([
    getStudies(status in StudyStatus ? { status } : {}),
    getMeetingOptions(),
  ]);

  const visible =
    status === "ABERTOS"
      ? studies.filter((s) =>
          (OPEN_STUDY_STATUS as readonly string[]).includes(s.status),
        )
      : studies;

  return (
    <>
      <Topbar title="Textos e exercícios" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <EspiritualSubNav />

        <div className="flex flex-wrap items-center gap-3">
          <StudyFilters />
        </div>

        <StudyForm meetings={meetings} />

        {visible.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nada aqui ainda. Cada texto ou exercício que a mestre passar pode
            entrar com o prazo da entrega final.
          </p>
        ) : (
          <div className={itemGrid}>
            {visible.map((study) => (
              <StudyCard
                key={study.id}
                study={study}
                meetings={meetings}
                today={toDateInputValue(today)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
