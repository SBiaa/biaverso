import { Topbar } from "@/components/layout/Topbar";
import { itemGrid } from "@/components/layout/page-width";
import { EspiritualSubNav } from "@/components/modules/espiritual/EspiritualSubNav";
import { DivinationForm } from "@/components/modules/espiritual/DivinationForm";
import { DivinationCard } from "@/components/modules/espiritual/DivinationCard";
import { getDivinations } from "@/lib/espiritual";

export const dynamic = "force-dynamic";

export default async function TiragensPage() {
  const divinations = await getDivinations();

  return (
    <>
      <Topbar title="Tiragens" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <EspiritualSubNav />

        <DivinationForm />

        {divinations.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nenhuma tiragem registrada. O campo &ldquo;o que se confirmou&rdquo;
            pode ficar vazio agora e ser preenchido meses depois — é ele que
            transforma o registro em aprendizado.
          </p>
        ) : (
          <div className={itemGrid}>
            {divinations.map((divination) => (
              <DivinationCard key={divination.id} divination={divination} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
