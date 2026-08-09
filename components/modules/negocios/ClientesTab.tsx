import Link from "next/link";
import { Card } from "@/components/ui";
import { getInitials, formatUtcDateBR } from "@/lib/utils";
import { ClientStatusFilter } from "./ClientStatusFilter";
import { AddClientForm } from "./AddClientForm";
import type { ClientOverview } from "@/lib/ace";

export function ClientesTab({
  businessId,
  clients,
}: {
  businessId: string;
  clients: ClientOverview[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ClientStatusFilter />
        <AddClientForm businessId={businessId} />
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum cliente encontrado.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {clients.map((client) => (
            <Link key={client.id} href={`/negocios/${businessId}/clientes/${client.id}`}>
              <Card className="flex items-center justify-between transition-colors hover:bg-black/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                    {getInitials(client.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{client.name}</p>
                    <p className="text-xs text-text-secondary">
                      {client.activeProjectCount} projeto{client.activeProjectCount === 1 ? "" : "s"}{" "}
                      ativo{client.activeProjectCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary">Próxima entrega</p>
                  <p className="text-xs font-medium text-text-primary">
                    {client.nextDelivery
                      ? formatUtcDateBR(new Date(client.nextDelivery.date))
                      : "—"}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
