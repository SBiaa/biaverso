import { Card } from "@/components/ui";
import { formatCurrencyBRL } from "@/lib/utils";
import type { BusinessPeriodSummary } from "@/lib/avaliacao-negocios";

type Fact = { text: string; tone: "normal" | "late" | "good" };

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** As frases de um negócio, só as que têm algo a dizer. */
function factsFor(b: BusinessPeriodSummary): Fact[] {
  const facts: Fact[] = [];

  if (b.postsPublished) {
    facts.push({ text: plural(b.postsPublished, "post publicado", "posts publicados"), tone: "good" });
  }
  if (b.postsLate) {
    facts.push({ text: plural(b.postsLate, "post atrasado", "posts atrasados"), tone: "late" });
  }
  if (b.tasksDone) {
    facts.push({ text: plural(b.tasksDone, "tarefa concluída", "tarefas concluídas"), tone: "good" });
  }
  if (b.tasksLate) {
    facts.push({ text: plural(b.tasksLate, "tarefa atrasada", "tarefas atrasadas"), tone: "late" });
  }
  if (b.dayTasksDone) {
    facts.push({
      text: plural(b.dayTasksDone, "tarefa do dia feita", "tarefas do dia feitas"),
      tone: "normal",
    });
  }
  if (b.ordersNew) {
    facts.push({ text: plural(b.ordersNew, "pedido novo", "pedidos novos"), tone: "normal" });
  }
  if (b.ordersDelivered) {
    facts.push({
      text: `${plural(b.ordersDelivered, "pedido entregue", "pedidos entregues")} · ${formatCurrencyBRL(b.ordersRevenue ?? 0)}`,
      tone: "good",
    });
  }
  if (b.moneyIn) {
    facts.push({ text: `entrou ${formatCurrencyBRL(b.moneyIn)}`, tone: "good" });
  }
  if (b.moneyOut) {
    facts.push({ text: `saiu ${formatCurrencyBRL(b.moneyOut)}`, tone: "normal" });
  }

  return facts;
}

const toneClass: Record<Fact["tone"], string> = {
  normal: "bg-hover text-text-secondary",
  good: "bg-success-soft-bg text-success-soft-text",
  late: "bg-danger-soft-bg text-danger-soft-text",
};

/**
 * Um bloco por negócio com o que aconteceu no período, em frases curtas. O
 * negócio que mais mexeu vem primeiro; o que não mexeu diz isso em vez de
 * esconder — numa avaliação, "nada" também é informação.
 */
export function BusinessPeriodSummaryCard({
  title,
  businesses,
}: {
  title: string;
  businesses: BusinessPeriodSummary[];
}) {
  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold text-text-primary">{title}</h2>
      {businesses.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum negócio ativo.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/60">
          {businesses.map((b) => {
            const facts = factsFor(b);
            return (
              <li key={b.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: b.color }}
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-text-primary">{b.name}</span>
                </div>
                {facts.length === 0 ? (
                  <p className="text-sm text-text-secondary">Nada registrado.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {facts.map((fact) => (
                      <span
                        key={fact.text}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass[fact.tone]}`}
                      >
                        {fact.text}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
