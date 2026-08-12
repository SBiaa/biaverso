import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { BusinessGrid } from "@/components/modules/negocios/BusinessGrid";

export const dynamic = "force-dynamic";

export default async function NegociosPage() {
  const businesses = await prisma.business.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      clients: { where: { status: "ATIVO" } },
      modules: { where: { active: true }, orderBy: { order: "asc" } },
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
    modules: b.modules.map((m) => m.module),
  }));

  return (
    <>
      <Topbar title="Negócios" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-5 md:px-8 md:py-8">
        <BusinessGrid businesses={items} />
      </main>
    </>
  );
}
