import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { BusinessTabs } from "@/components/modules/negocios/BusinessTabs";
import { BusinessModulesForm } from "@/components/modules/negocios/BusinessModulesForm";
import { buildBusinessTabs, withAllModules } from "@/lib/business-modules";

export const dynamic = "force-dynamic";

export default async function BusinessSettingsPage({
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

  return (
    <>
      <Topbar width="narrow" title={business.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <BusinessTabs
          businessId={id}
          tabs={buildBusinessTabs(id, business.modules)}
          active="configuracoes"
        />
        <BusinessModulesForm
          businessId={id}
          initialModules={withAllModules(business.modules)}
        />
      </main>
    </>
  );
}
