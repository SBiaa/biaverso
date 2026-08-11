import { Gift, ListChecks, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMonthPlan } from "@/lib/finance";
import { Topbar } from "@/components/layout/Topbar";
import { Card, StatCard } from "@/components/ui";
import { WishlistForm } from "@/components/modules/desejos/WishlistForm";
import { WishlistFilters } from "@/components/modules/desejos/WishlistFilters";
import { WishlistCard } from "@/components/modules/desejos/WishlistCard";
import { WishlistBudget } from "@/components/modules/desejos/WishlistBudget";
import { formatCurrencyBRL, todayUtc } from "@/lib/utils";
import { wishPriorityLabels } from "@/lib/labels";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  businessId?: string;
  category?: string;
  priority?: string;
  status?: string;
}>;

// Essencial primeiro, "algum dia" por último — é a ordem em que ela decide.
const priorityOrder = ["ESSENCIAL", "QUERO", "ALGUM_DIA"];

export default async function DesejosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const where: Prisma.WishlistItemWhereInput = {};
  if (params.businessId === "PESSOAL") where.businessId = null;
  else if (params.businessId) where.businessId = params.businessId;
  if (params.category)
    where.category = params.category as Prisma.WishlistItemWhereInput["category"];
  if (params.priority)
    where.priority = params.priority as Prisma.WishlistItemWhereInput["priority"];
  // Sem filtro de status, a lista mostra só o que ainda é desejo.
  if (params.status === "TODOS") {
    // sem filtro
  } else if (params.status) {
    where.status = params.status as Prisma.WishlistItemWhereInput["status"];
  } else {
    where.status = "DESEJADO";
  }

  const hoje = todayUtc();
  const mes = hoje.getUTCMonth() + 1;
  const ano = hoje.getUTCFullYear();

  const [items, businesses, plano] = await Promise.all([
    prisma.wishlistItem.findMany({
      where,
      include: { business: true },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    }),
    prisma.business.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    // O que sobra do mês é o que diz se a lista cabe.
    getMonthPlan(mes, ano),
  ]);

  const desejados = items.filter((i) => i.status === "DESEJADO");
  const totalDesejado = desejados.reduce((sum, i) => sum + (i.price ?? 0), 0);
  const totalEssencial = desejados
    .filter((i) => i.priority === "ESSENCIAL")
    .reduce((sum, i) => sum + (i.price ?? 0), 0);
  const semPreco = desejados.filter((i) => i.price == null).length;

  const grupos = priorityOrder
    .map((priority) => ({
      priority,
      itens: items.filter((i) => i.priority === priority),
    }))
    .filter((g) => g.itens.length > 0);

  return (
    <>
      <Topbar title="Lista de desejos" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Custa realizar a lista"
            value={formatCurrencyBRL(totalDesejado)}
            icon={<Sparkles size={16} className="text-accent" />}
          />
          <StatCard
            label="Só os essenciais"
            value={formatCurrencyBRL(totalEssencial)}
            icon={<ListChecks size={16} className="text-text-secondary" />}
          />
          <StatCard
            label="Desejos na lista"
            value={String(desejados.length)}
            icon={<Gift size={16} className="text-text-secondary" />}
          />
        </div>

        {desejados.length > 0 && (
          <WishlistBudget
            items={desejados}
            balance={plano.balance}
            month={mes}
            year={ano}
            totalDesejado={totalDesejado}
            totalEssencial={totalEssencial}
            priorityOrder={priorityOrder}
            filtered={
              !!(params.businessId || params.category || params.priority)
            }
          />
        )}

        {semPreco > 0 && (
          <p className="text-xs text-text-secondary">
            {semPreco === 1
              ? "1 desejo está sem preço, então não entra nos totais."
              : `${semPreco} desejos estão sem preço, então não entram nos totais.`}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <WishlistFilters businesses={businesses} />
          <WishlistForm businesses={businesses} />
        </div>

        {items.length === 0 ? (
          <Card>
            <p className="text-sm text-text-secondary">
              Nada por aqui ainda. Cadastre o que você quer e marque para o que
              é — pessoal, casa ou algum dos negócios.
            </p>
          </Card>
        ) : (
          grupos.map((grupo) => (
            <section key={grupo.priority} className="space-y-2">
              <h2 className="text-sm font-semibold text-text-primary">
                {wishPriorityLabels[grupo.priority]}
                <span className="ml-2 font-normal text-text-secondary">
                  {grupo.itens.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grupo.itens.map((item) => (
                  <WishlistCard
                    key={item.id}
                    businesses={businesses}
                    item={{
                      ...item,
                      targetDate: item.targetDate?.toISOString() ?? null,
                      boughtAt: item.boughtAt?.toISOString() ?? null,
                    }}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </>
  );
}
