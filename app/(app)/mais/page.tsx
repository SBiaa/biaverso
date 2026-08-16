import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { navGroups, type NavItem } from "@/components/layout/nav-config";
import { CommandPaletteTrigger } from "@/components/layout/CommandPalette";
import { getBusinessIcon } from "@/lib/business-visuals";

// Já estão na barra de baixo, que fica sempre visível: repetir aqui só faria
// a lista crescer sem dar acesso novo a nada.
const skipHrefs = new Set(["/", "/dia", "/financeiro", "/cardapio"]);

export const dynamic = "force-dynamic";

function DestinationLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="flex min-h-[52px] items-center gap-3 rounded-xl border border-border bg-surface px-3 shadow-elevation transition-colors hover:bg-hover"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
        <Icon size={16} />
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-text-primary">
        {item.label}
      </span>
    </Link>
  );
}

export default async function MaisPage() {
  const businesses = await prisma.business.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, icon: true },
  });

  // Os mesmos grupos da sidebar, com os negócios pendurados no grupo deles.
  // Antes esta tela era uma grade única de 18 cartões idênticos: a hierarquia
  // que existe no desktop sumia justo no celular, onde ela pesa mais.
  const groups = navGroups
    .map((group) => ({
      title: group.title,
      items: [
        ...group.items.filter((item) => !skipHrefs.has(item.href)),
        ...(group.showBusinesses
          ? businesses.map((business) => ({
              href: `/negocios/${business.id}`,
              label: business.name,
              icon: getBusinessIcon(business.icon),
            }))
          : []),
      ],
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <Topbar title="Mais" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-5 md:px-8 md:py-8">
        {/* No celular esta é a central de navegação, e a sidebar (onde mora o
            campo de busca) não existe. Sem isto a busca só abriria por Ctrl+K,
            atalho que ninguém tem no telefone. */}
        <CommandPaletteTrigger />

        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.title} className="flex flex-col gap-2">
              <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary/70">
                {group.title}
              </h2>
              {/* Uma coluna no celular: em duas, "Central de Visão" e "Lista de
                  desejos" cortavam no meio. Linha inteira lê de relance. */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.items.map((item) => (
                  <DestinationLink key={item.href} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
