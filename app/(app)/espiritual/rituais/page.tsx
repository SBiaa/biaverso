import { Topbar } from "@/components/layout/Topbar";
import { itemGrid } from "@/components/layout/page-width";
import { EspiritualSubNav } from "@/components/modules/espiritual/EspiritualSubNav";
import { RitualForm } from "@/components/modules/espiritual/RitualForm";
import { RitualCard } from "@/components/modules/espiritual/RitualCard";
import { getRituals } from "@/lib/espiritual";

export const dynamic = "force-dynamic";

export default async function RituaisPage() {
  const rituals = await getRituals();

  return (
    <>
      <Topbar title="Diário de rituais" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <EspiritualSubNav />

        <RitualForm />

        {rituals.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nada registrado ainda. A fase da lua de cada registro é calculada pela
            data — você não precisa anotar.
          </p>
        ) : (
          <div className={itemGrid}>
            {rituals.map((ritual) => (
              <RitualCard key={ritual.id} ritual={ritual} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
