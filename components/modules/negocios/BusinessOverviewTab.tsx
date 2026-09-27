import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  FileText,
  FolderKanban,
  ListTodo,
  Package,
  Users,
  Wallet,
} from "lucide-react";
import { Card, CardTitle, StatCard } from "@/components/ui";
import { ProjectGrid } from "@/components/modules/projetos/ProjectGrid";
import { cn, formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { transactionCategoryLabels } from "@/lib/labels";
import type { BusinessOverview } from "@/lib/business-overview";
import type { ProjectCard } from "@/lib/projects-shared";

const kindLabels: Record<string, string> = {
  post: "Post",
  task: "Tarefa",
  order: "Pedido",
};

const kindIcons: Record<string, typeof FileText> = {
  post: FileText,
  task: ListTodo,
  order: Package,
};

/**
 * Home do negócio: o resumo de tudo antes de entrar nas abas de trabalho.
 * Cada bloco só aparece se o módulo correspondente estiver ligado — um negócio
 * só de loja não precisa ver card de cronograma vazio.
 */
export function BusinessOverviewTab({
  businessId,
  overview,
  projects,
  tabs,
}: {
  businessId: string;
  overview: BusinessOverview;
  projects: ProjectCard[];
  /** Abas ligadas, para os atalhos do rodapé. */
  tabs: { key: string; label: string; href: string; ownPage: boolean }[];
}) {
  const { stats, deadlines, overdueCount, recentTransactions } = overview;

  const cards = [
    stats.activeProjects !== null && {
      label: "Projetos ativos",
      value: stats.activeProjects,
      icon: <FolderKanban size={16} className="text-text-secondary" />,
    },
    stats.activeClients !== null && {
      label: "Clientes ativos",
      value: stats.activeClients,
      icon: <Users size={16} className="text-text-secondary" />,
    },
    stats.openTasks !== null && {
      label: "Tarefas em aberto",
      value: stats.openTasks,
      icon: <ListTodo size={16} className="text-text-secondary" />,
    },
    stats.plannedPosts !== null && {
      label: "Posts a publicar",
      value: stats.plannedPosts,
      icon: <FileText size={16} className="text-text-secondary" />,
    },
    stats.openOrders !== null && {
      label: "Pedidos em aberto",
      value: stats.openOrders,
      icon: <Package size={16} className="text-text-secondary" />,
    },
    stats.monthBalance !== null && {
      label: "Saldo do mês",
      value: formatCurrencyBRL(stats.monthBalance),
      icon: <Wallet size={16} className="text-text-secondary" />,
      valueClassName: stats.monthBalance >= 0 ? "text-emerald-600" : "text-red-600",
    },
  ].filter(Boolean) as {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    valueClassName?: string;
  }[];

  return (
    <div className="flex flex-col gap-4">
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-600/20 bg-red-600/5 p-3 text-sm text-red-600">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            {overdueCount === 1
              ? "1 item atrasado neste negócio."
              : `${overdueCount} itens atrasados neste negócio.`}
          </span>
        </div>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {cards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              valueClassName={card.valueClassName}
            />
          ))}
        </div>
      )}

      <Card className="flex flex-col gap-3">
        <CardTitle className="flex items-center gap-2">
          <CalendarClock size={15} className="text-text-secondary" />
          Próximos prazos
        </CardTitle>
        {deadlines.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nada com prazo nos próximos 7 dias.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {deadlines.map((item) => {
              const Icon = kindIcons[item.kind] ?? ListTodo;
              return (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon size={14} className="shrink-0 text-text-secondary" />
                    <div className="min-w-0">
                      <p className="truncate text-text-primary">{item.title}</p>
                      <p className="text-xs text-text-secondary">
                        {kindLabels[item.kind]}
                        {item.subtitle && ` · ${item.subtitle}`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 whitespace-nowrap text-xs",
                      item.overdue ? "font-medium text-red-600" : "text-text-secondary",
                    )}
                  >
                    {formatDateBR(new Date(item.date))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {projects.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle>Projetos</CardTitle>
            <Link
              href={`/negocios/${businessId}?tab=interno`}
              className="-my-2 py-2 text-xs font-medium text-accent hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <ProjectGrid projects={projects} sort="prazo" showBusinessGroups={false} />
        </div>
      )}

      {recentTransactions.length > 0 && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle>
              Últimas transações
            </CardTitle>
            <Link
              href={`/negocios/${businessId}?tab=financeiro`}
              className="-my-2 py-2 text-xs font-medium text-accent hover:underline"
            >
              Ver financeiro
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {recentTransactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-text-primary">{t.name}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDateBR(new Date(t.date))} ·{" "}
                    {transactionCategoryLabels[t.category] ?? t.category}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-medium",
                    t.type === "ENTRADA" ? "text-emerald-600" : "text-red-600",
                  )}
                >
                  {t.type === "ENTRADA" ? "+" : "−"}
                  {formatCurrencyBRL(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tabs.length > 0 && (
        <Card className="flex flex-col gap-3">
          <CardTitle>Ir para</CardTitle>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={tab.ownPage ? tab.href : `${tab.href}?tab=${tab.key}`}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-hover"
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
