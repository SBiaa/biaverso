import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { BusinessGrid } from "@/components/modules/negocios/BusinessGrid";

export const dynamic = "force-dynamic";

export default async function NegociosPage() {
  const businesses = await prisma.business.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      clients: { where: { status: "ATIVO" } },
    },
  });

  const items = businesses.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    color: b.color,
    icon: b.icon,
    active: b.active,
    activeClientCount: b.clients.length,
  }));

  return (
    <>
      <Topbar title="Negócios" />
      <main className="flex-1 p-4 md:p-6">
        <BusinessGrid businesses={items} />
      </main>
    </>
  );
}
