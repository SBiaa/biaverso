import type { ReactNode } from "react";
import { Card } from "@/components/ui";

/**
 * Casca de um bloco do radar. Só existe para os quatro blocos ficarem iguais —
 * título, contagem e a explicação do que aquele número quer dizer.
 */
export function RadarSection({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count: number;
  hint: string;
  children: ReactNode;
}) {
  if (count === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <span className="text-sm text-text-secondary">{count}</span>
        </div>
        <p className="mt-0.5 text-xs text-text-secondary">{hint}</p>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </Card>
  );
}

/** Linha de um item parado: o texto à esquerda, as saídas à direita. */
export function RadarRow({
  children,
  actions,
}: {
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 items-center gap-1">{actions}</div>
    </div>
  );
}

/**
 * Barra de constância. Verde não é meta batida — é só o quanto foi feito dos
 * dias que existiram, para o olho pegar o padrão sem ler o número.
 */
export function ConsistencyBar({ done, tracked }: { done: number; tracked: number }) {
  const percent = tracked === 0 ? 0 : Math.round((done / tracked) * 100);

  return (
    <div className="mt-1.5 h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-border">
      <div
        className="h-full rounded-full bg-accent transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/**
 * "3 de 5 dias · 2 sem registro".
 *
 * O "sem registro" fica visível de propósito: são dias em que o app não foi
 * aberto, e misturar isso com "não fiz" faria a conta acusar uma semana de
 * viagem como uma semana de fracasso.
 */
export function ConsistencyLabel({
  done,
  tracked,
  untracked,
}: {
  done: number;
  tracked: number;
  untracked: number;
}) {
  return (
    <span className="text-xs text-text-secondary">
      {done} de {tracked} {tracked === 1 ? "dia" : "dias"}
      {untracked > 0 && ` · ${untracked} sem registro`}
    </span>
  );
}
