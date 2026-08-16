import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * O único sinal de "olha aqui" do app.
 *
 * O padrão nasceu na Beleza (a borda esquerda vermelha/âmbar dos cuidados
 * atrasados) e era o melhor recurso visual que o app tinha — só que ficava
 * preso num módulo. Fora de lá, cada tela inventava o seu: um selo vermelho
 * escrito à mão aqui, um texto `text-red-600` ali, um `bg-red-50` acolá.
 *
 * Três níveis e nada mais, porque a régua só funciona enquanto for curta:
 *
 * - `atrasado` — o prazo já passou. Vermelho.
 * - `atencao`  — vence hoje ou está chegando. Âmbar.
 * - `ok`       — em dia. Verde, e só quando dizer "está tudo bem" informa
 *                alguma coisa; na maioria das listas o certo é não pintar.
 * - `neutro`   — sem prazo. Cinza.
 */
export type AttentionLevel = "atrasado" | "atencao" | "ok" | "neutro";

/**
 * Borda esquerda do card. `ok` e `neutro` são transparentes de propósito: sem
 * elas o conteúdo dança 4px para o lado conforme o item fica atrasado ou não.
 */
export const attentionBorder: Record<AttentionLevel, string> = {
  atrasado: "border-l-4 border-l-danger",
  atencao: "border-l-4 border-l-warning-soft-text",
  ok: "border-l-4 border-l-transparent",
  neutro: "border-l-4 border-l-transparent",
};

/**
 * Fundo e texto do selo — em tokens, e não em `bg-red-600` fixo, porque no
 * tema escuro um selo vermelho vivo vira a coisa mais clara da tela.
 */
const pillStyles: Record<AttentionLevel, string> = {
  // Sólido, e não tinta suave: "Atrasado" é o aviso mais forte do app e
  // precisa continuar sendo o que mais salta numa lista longa.
  atrasado: "bg-danger-solid-bg text-danger-solid-text",
  atencao: "bg-warning-soft-bg text-warning-soft-text",
  ok: "bg-success-soft-bg text-success-soft-text",
  neutro: "bg-border text-text-secondary",
};

/** Cor do texto solto (uma data de prazo, por exemplo). */
export const attentionText: Record<AttentionLevel, string> = {
  atrasado: "font-medium text-danger",
  atencao: "font-medium text-warning-soft-text",
  ok: "text-text-secondary",
  neutro: "text-text-secondary",
};

export function AttentionBadge({
  level,
  children,
  className,
}: {
  level: AttentionLevel;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
        pillStyles[level],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * O nível a partir de uma data de vencimento.
 *
 * `hoje` entra como parâmetro em vez de sair de `new Date()` aqui dentro: as
 * telas do app comparam datas em UTC (`todayUtc`), e um `new Date()` local
 * daria "atrasado" algumas horas antes da conta.
 */
export function attentionFromDueDate(
  dueDate: Date | string | null,
  today: Date,
  { done = false }: { done?: boolean } = {},
): AttentionLevel {
  if (done || !dueDate) return "neutro";

  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const days = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days < 0) return "atrasado";
  if (days <= 1) return "atencao";
  return "ok";
}
