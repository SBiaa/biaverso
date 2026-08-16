import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { BusinessBadge, Card, CardTitle } from "@/components/ui";
import { ClientContactForm } from "@/components/modules/clientes/ClientContactForm";
import { ClientBusinessLinks } from "@/components/modules/clientes/ClientBusinessLinks";
import { getInitials } from "@/lib/utils";

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
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        instagram: true,
        notes: true,
        businessLinks: {
          orderBy: { joinedAt: "asc" },
          select: {
            id: true,
            businessId: true,
            status: true,
            joinedAt: true,
            business: { select: { id: true, name: true, color: true } },
          },
        },
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
      <Topbar
        width="narrow"
        title={client.name}
        trail={[{ label: "Clientes", href: "/clientes" }]}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={15} />
          Todos os clientes
        </Link>

        <Card className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent/10 text-lg font-semibold text-accent">
            {getInitials(client.name)}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-text-primary">{client.name}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {client.businessLinks.length === 0 ? (
                <span className="text-xs text-text-secondary">
                  Sem negócio vinculado
                </span>
              ) : (
                client.businessLinks.map((link) => (
                  <BusinessBadge
                    key={link.id}
                    business={link.business}
                    className={link.status === "ATIVO" ? undefined : "opacity-50"}
                  />
                ))
              )}
            </div>
          </div>
        </Card>

        <Card>
          <ClientContactForm client={client} />
        </Card>

        <Card className="flex flex-col gap-3">
          <CardTitle>Negócios</CardTitle>
          <ClientBusinessLinks
            clientId={client.id}
            links={client.businessLinks.map((link) => ({
              id: link.id,
              businessId: link.businessId,
              status: link.status,
              joinedAt: link.joinedAt.toISOString(),
              business: link.business,
            }))}
            allBusinesses={allBusinesses}
          />
        </Card>

        {client.businessLinks.length > 0 && (
          <Card className="flex flex-col gap-3">
            <CardTitle>
              Ver dentro do negócio
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {client.businessLinks.map((link) => (
                <Link
                  key={link.id}
                  href={`/negocios/${link.businessId}/clientes/${client.id}`}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-hover"
                >
                  {link.business.name}
                </Link>
              ))}
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
