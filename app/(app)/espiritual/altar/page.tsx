import { Topbar } from "@/components/layout/Topbar";
import { itemGrid } from "@/components/layout/page-width";
import { CardTitle } from "@/components/ui";
import { EspiritualSubNav } from "@/components/modules/espiritual/EspiritualSubNav";
import { AltarForm } from "@/components/modules/espiritual/AltarForm";
import { AltarItemCard } from "@/components/modules/espiritual/AltarItemCard";
import { getAltarItems } from "@/lib/espiritual";
import { altarCategoryLabels } from "@/lib/espiritual-shared";

export const dynamic = "force-dynamic";

export default async function AltarPage() {
  const items = await getAltarItems();

  // Agrupado por categoria: procurar uma erva no meio de cristais e velas é o
  // que uma lista corrida obrigaria a fazer. A ordem é a dos rótulos, então
  // ervas vêm sempre antes de cristais, e não na ordem em que foram cadastrados.
  const groups = Object.keys(altarCategoryLabels)
    .map((category) => ({
      category,
      items: items.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0);

  const runningLow = items.filter((item) => item.runningLow);

  return (
    <>
      <Topbar title="Altar" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <EspiritualSubNav />

        <AltarForm />

        {runningLow.length > 0 && (
          <p className="text-sm text-text-secondary">
            Acabando:{" "}
            <span className="text-text-primary">
              {runningLow.map((item) => item.name).join(", ")}
            </span>
          </p>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-text-secondary">
            O altar está vazio aqui. Cadastre ervas, cristais, velas e ferramentas
            para saber o que você tem antes de planejar um ritual.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.category} className="space-y-3">
              <CardTitle>{altarCategoryLabels[group.category]}</CardTitle>
              <div className={itemGrid}>
                {group.items.map((item) => (
                  <AltarItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </>
  );
}
