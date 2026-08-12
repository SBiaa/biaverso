import { Topbar } from "@/components/layout/Topbar";
import { BelezaSubNav } from "@/components/modules/beleza/BelezaSubNav";
import { ProductGrid } from "@/components/modules/beleza/ProductGrid";
import { getProducts } from "@/lib/beleza";
import { ProductCategory } from "@/app/generated/prisma/enums";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ category?: string; status?: string }>;

const validStatuses = ["ativos", "acabados", "todos"];

export default async function BelezaProdutosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  // Param inventado na URL vira "sem filtro" em vez de query quebrada.
  const category =
    params.category && params.category in ProductCategory ? params.category : "";
  const status =
    params.status && validStatuses.includes(params.status) ? params.status : "ativos";

  const products = await getProducts({ category: category || undefined, status });

  return (
    <>
      <Topbar title="Produtos" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <h1 className="text-lg font-semibold text-text-primary md:hidden">
          Produtos
        </h1>

        <BelezaSubNav />

        <ProductGrid products={products} category={category} status={status} />
      </main>
    </>
  );
}
