import Link from "next/link";
import { Wallet } from "lucide-react";
import { Card } from "@/components/ui";
import { formatCurrencyBRL, formatMonthYearBR } from "@/lib/utils";
import { wishPriorityLabels } from "@/lib/labels";

type Item = {
  id: string;
  name: string;
  price: number | null;
  priority: string;
};

/** Essencial primeiro; dentro da prioridade, o mais barato cabe antes. */
function fitInBalance(items: Item[], balance: number, order: string[]) {
  const withPrice = items
    .filter((i): i is Item & { price: number } => i.price != null && i.price > 0)
    .sort(
      (a, b) =>
        order.indexOf(a.priority) - order.indexOf(b.priority) ||
        a.price - b.price,
    );

  let left = balance;
  const fits: (Item & { price: number })[] = [];
  for (const item of withPrice) {
    // Um item caro que não cabe não bloqueia os próximos: o que sobra ainda
    // pode dar para algo mais barato.
    if (item.price <= left) {
      fits.push(item);
      left -= item.price;
    }
  }
  return { fits, left };
}

/**
 * Compara o preço da lista com o que sobra no mês. O saldo é o do mês inteiro
 * (o que já caiu menos tudo que sai), não por negócio — mesmo quando a lista
 * está filtrada.
 */
export function WishlistBudget({
  items,
  balance,
  month,
  year,
  totalDesejado,
  totalEssencial,
  priorityOrder,
  filtered,
}: {
  items: Item[];
  balance: number;
  month: number;
  year: number;
  totalDesejado: number;
  totalEssencial: number;
  priorityOrder: string[];
  filtered: boolean;
}) {
  const sobra = Math.max(balance, 0);
  const { fits } = fitInBalance(items, sobra, priorityOrder);
  const faltaEssencial = totalEssencial - sobra;
  const faltaTudo = totalDesejado - sobra;

  const veredito =
    balance <= 0
      ? "O mês está no vermelho, então não sobra nada para a lista."
      : totalDesejado > 0 && sobra >= totalDesejado
        ? "Dá para realizar a lista inteira este mês."
        : totalEssencial > 0 && sobra >= totalEssencial
          ? `Dá para os essenciais. Faltam ${formatCurrencyBRL(faltaTudo)} para o resto da lista.`
          : totalEssencial > 0
            ? `Faltam ${formatCurrencyBRL(faltaEssencial)} para dar conta dos essenciais.`
            : `Faltam ${formatCurrencyBRL(faltaTudo)} para a lista.`;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Wallet size={16} className="text-text-secondary" />
          Cabe no seu mês?
        </h2>
        <Link
          href="/financeiro/planejamento"
          className="text-xs font-medium text-accent"
        >
          Ver planejamento
        </Link>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-text-secondary">
          Sobra em {formatMonthYearBR(month, year)}:{" "}
          <span
            className={
              balance >= 0
                ? "font-semibold text-emerald-600"
                : "font-semibold text-red-600"
            }
          >
            {formatCurrencyBRL(balance)}
          </span>
        </span>
        <span className="text-text-secondary">
          Lista:{" "}
          <span className="font-semibold text-text-primary">
            {formatCurrencyBRL(totalDesejado)}
          </span>
        </span>
        {totalEssencial > 0 && (
          <span className="text-text-secondary">
            Essenciais:{" "}
            <span className="font-semibold text-text-primary">
              {formatCurrencyBRL(totalEssencial)}
            </span>
          </span>
        )}
      </div>

      <p className="text-sm text-text-primary">{veredito}</p>

      {fits.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-text-secondary">
            Cabe agora, nesta ordem:
          </p>
          <ul className="flex flex-col gap-1">
            {fits.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-text-primary">
                  {item.name}
                  <span className="ml-2 text-xs text-text-secondary">
                    {wishPriorityLabels[item.priority]}
                  </span>
                </span>
                <span className="font-medium text-text-primary">
                  {formatCurrencyBRL(item.price)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-text-secondary">
        A sobra é a do mês inteiro — entradas que já caíram menos contas fixas,
        cartão e demais saídas.
        {filtered && " A lista está filtrada, mas a sobra continua sendo a geral."}
      </p>
    </Card>
  );
}
