import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { BusinessTabs } from "@/components/modules/negocios/BusinessTabs";
import { ClientAvatar } from "@/components/modules/clientes/ClientAvatar";
import { Card } from "@/components/ui";
import { buildBusinessTabs } from "@/lib/business-modules";
import { FEED_POST_TYPES, sundayOfWeek } from "@/lib/feed";
import { addUtcDays, parseDateOnly } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Aba Feed: as clientes do negócio, cada uma levando à prévia do perfil. */
export default async function BusinessFeedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const business = await prisma.business.findUnique({
    where: { id },
    include: { modules: { orderBy: { order: "asc" } } },
  });
  if (!business) notFound();

  // Módulo desligado não tem aba: chegar aqui pela URL é o mesmo que não existir.
  const tabs = buildBusinessTabs(id, business.modules);
  if (!tabs.some((t) => t.key === "feed")) notFound();

  const sunday = parseDateOnly(sundayOfWeek())!;
  const monday = addUtcDays(sunday, -6);

  const links = await prisma.clientBusiness.findMany({
    where: { businessId: id, status: { in: ["ATIVO", "PAUSADO"] } },
    orderBy: { client: { name: "asc" } },
    select: {
      status: true,
      client: {
        select: {
          id: true,
          name: true,
          color: true,
          photo: true,
          instagram: true,
          instagramProfile: { select: { handle: true, photo: true } },
          _count: {
            select: {
              contentPosts: {
                where: {
                  businessId: id,
                  network: "INSTAGRAM",
                  type: { in: [...FEED_POST_TYPES] },
                  status: { not: "CANCELADO" },
                  publishDate: { gte: monday, lte: sunday },
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    <>
      <Topbar title={business.name} trail={[{ label: "Negócios", href: "/negocios" }]} />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <BusinessTabs businessId={id} tabs={tabs} active="feed" />

        {links.length === 0 ? (
          <Card>
            <p className="text-sm text-text-secondary">
              Nenhuma cliente ativa neste negócio ainda. Quem estiver na aba Clientes aparece aqui.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {links.map(({ client, status }) => {
              const handle = client.instagramProfile?.handle ?? client.instagram?.replace(/^@/, "");
              const weekCount = client._count.contentPosts;
              return (
                <Link key={client.id} href={`/negocios/${id}/feed/${client.id}`}>
                  <Card className="flex items-center gap-3 transition-colors hover:bg-hover">
                    <ClientAvatar
                      client={{ ...client, photo: client.instagramProfile?.photo ?? client.photo }}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text-primary">{client.name}</p>
                      <p className="truncate text-sm text-text-secondary">
                        {handle ? `@${handle}` : "Sem @ ainda"}
                        {status === "PAUSADO" && " · pausada"}
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-xs text-text-secondary">
                      <span className="block text-lg font-semibold text-text-primary">{weekCount}</span>
                      {weekCount === 1 ? "post" : "posts"} na semana
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
