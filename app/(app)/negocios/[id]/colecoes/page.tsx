import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { BusinessTabs } from "@/components/modules/negocios/BusinessTabs";
import { CollectionsGrid, type CollectionCard } from "@/components/modules/loja/CollectionsGrid";
import { buildBusinessTabs } from "@/lib/business-modules";

export const dynamic = "force-dynamic";

export default async function BusinessCollectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const business = await prisma.business.findUnique({
    where: { id },
    include: { modules: { orderBy: { order: "asc" } } },
  });
  if (!business) notFound();

  // Módulo desligado não tem aba: chegar aqui pela URL é o mesmo que não existir.
  const tabs = buildBusinessTabs(id, business.modules);
  if (!tabs.some((t) => t.key === "colecoes")) notFound();

  const collections = await prisma.collection.findMany({
    where: { businessId: id },
    include: {
      _count: { select: { products: true } },
      orders: { select: { totalAmount: true } },
    },
    orderBy: [{ launchDate: "desc" }, { createdAt: "desc" }],
  });

  const cards: CollectionCard[] = collections.map((c) => ({
    productCount: c._count.products,
    orderCount: c.orders.length,
    ordersTotal: c.orders.reduce((sum, o) => sum + o.totalAmount, 0),
    record: {
      id: c.id,
      name: c.name,
      description: c.description,
      season: c.season,
      status: c.status,
      launchDate: c.launchDate ? c.launchDate.toISOString() : null,
    },
  }));

  return (
    <>
      <Topbar
        title="Coleções"
        trail={[
          { label: "Negócios", href: "/negocios" },
          { label: business.name, href: `/negocios/${id}` },
        ]}
      />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <BusinessTabs businessId={id} tabs={tabs} active="colecoes" />
        <CollectionsGrid businessId={id} collections={cards} />
      </main>
    </>
  );
}
