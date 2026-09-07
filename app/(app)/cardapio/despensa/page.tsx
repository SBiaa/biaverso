import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { PantryList } from "@/components/modules/cardapio/PantryList";

export const dynamic = "force-dynamic";

export default async function DespensaPage() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      inStock: true,
      notes: true,
      recipes: { select: { recipe: { select: { title: true } } } },
    },
  });

  return (
    <>
      <Topbar
        title="Despensa"
        trail={[{ label: "Cardápio", href: "/cardapio" }]}
        width="narrow"
      />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8">
        <PantryList
          ingredients={ingredients.map((item) => ({
            id: item.id,
            name: item.name,
            inStock: item.inStock,
            notes: item.notes,
            recipes: item.recipes.map((r) => r.recipe.title),
          }))}
        />
      </main>
    </>
  );
}
