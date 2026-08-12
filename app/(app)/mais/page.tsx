import Link from "next/link";
import { Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { Topbar } from "@/components/layout/Topbar";
import { allNavItems } from "@/components/layout/nav-config";
import { getBusinessIcon } from "@/lib/business-visuals";

const primaryHrefs = new Set(["/", "/dia", "/financeiro", "/cardapio"]);

export const dynamic = "force-dynamic";

export default async function MaisPage() {
  const items = allNavItems.filter((item) => !primaryHrefs.has(item.href));
  const businesses = await prisma.business.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, icon: true },
  });

  return (
    <>
      <Topbar title="Mais" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-5 md:px-8 md:py-8">
        <h1 className="mb-4 text-lg font-semibold text-text-primary md:hidden">
          Mais
        </h1>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Link href="/negocios">
            <Card className="flex flex-col items-center gap-2 py-6 text-center transition-colors hover:bg-black/[0.02]">
              <Building2 size={22} className="text-accent" />
              <span className="text-sm font-medium text-text-primary">
                Todos os negócios
              </span>
            </Card>
          </Link>
          {businesses.map((business) => {
            const Icon = getBusinessIcon(business.icon);
            return (
              <Link key={business.id} href={`/negocios/${business.id}`}>
                <Card className="flex flex-col items-center gap-2 py-6 text-center transition-colors hover:bg-black/[0.02]">
                  <Icon size={22} className="text-accent" />
                  <span className="text-sm font-medium text-text-primary">
                    {business.name}
                  </span>
                </Card>
              </Link>
            );
          })}
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Card className="flex flex-col items-center gap-2 py-6 text-center transition-colors hover:bg-black/[0.02]">
                  <Icon size={22} className="text-accent" />
                  <span className="text-sm font-medium text-text-primary">
                    {item.label}
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
