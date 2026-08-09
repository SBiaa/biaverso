import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, BusinessBadge } from "@/components/ui";
import { BusinessLinkForm } from "@/components/modules/negocios/BusinessLinkForm";
import { ClientStatusToggle } from "@/components/modules/negocios/ClientStatusToggle";
import { getInitials, formatDateBR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [client, allBusinesses] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        businessLinks: { orderBy: { joinedAt: "asc" }, include: { business: true } },
      },
    }),
    prisma.business.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!client) notFound();

  return (
    <>
      <Topbar title={client.name} />
      <main className="flex-1 space-y-4 p-4 md:max-w-2xl md:p-6">
        <Card className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-lg font-semibold text-accent">
            {getInitials(client.name)}
          </div>
          <div>
            <p className="text-lg font-semibold text-text-primary">
              {client.name}
            </p>
            <div className="mt-1 flex gap-1">
              {client.businessLinks.map((b) => (
                <BusinessBadge key={b.id} business={b.business} />
              ))}
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Contato</h2>
          <p className="text-sm text-text-secondary">
            E-mail: {client.email ?? "—"}
          </p>
          <p className="text-sm text-text-secondary">
            Telefone: {client.phone ?? "—"}
          </p>
          <p className="text-sm text-text-secondary">
            Instagram: {client.instagram ?? "—"}
          </p>
          {client.notes && (
            <p className="text-sm text-text-secondary">
              Notas: {client.notes}
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Histórico por negócio
          </h2>
          {client.businessLinks.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <BusinessBadge business={link.business} />
                <span className="text-xs text-text-secondary">
                  desde {formatDateBR(link.joinedAt)}
                </span>
              </div>
              <ClientStatusToggle linkId={link.id} initialStatus={link.status} />
            </div>
          ))}
          <BusinessLinkForm
            clientId={client.id}
            allBusinesses={allBusinesses}
            existingBusinessIds={client.businessLinks.map((b) => b.businessId)}
          />
        </Card>
      </main>
    </>
  );
}
