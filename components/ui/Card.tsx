import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Sem sombra: o app tinha borda + cantos + elevação em toda caixa, e
        // uma tela com oito cards virava oito molduras competindo com o que
        // está escrito dentro. O que separa agora é o fundo branco sobre o
        // cinza da página e o espaço entre eles — a borda ficou só para dar o
        // limite, mais clara do que era.
        //
        // O padding cresce no desktop: 16px numa caixa de 600px de largura
        // aperta o conteúdo contra a borda.
        "rounded-xl border border-border/60 bg-surface p-4 md:p-5",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Card que abre alguma coisa ao ser clicado (Kanban, Prospecção).
 *
 * Era um `<div onClick>`: o mouse abria, mas o Tab passava reto e o Enter não
 * fazia nada — quem navega pelo teclado não tinha como abrir o card. Aqui ele
 * entra na ordem do Tab, abre com Enter ou Espaço e mostra o anel de foco.
 * Não é um `<button>` porque o conteúdo tem parágrafos e blocos, que não podem
 * morar dentro de um botão.
 */
export function ClickableCard({
  className,
  onActivate,
  label,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "onClick"> & {
  onActivate: () => void;
  /** O que o leitor de tela anuncia, ex.: "Abrir Lista de clientes". */
  label: string;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onActivate}
      onKeyDown={(e) => {
        // Só quando o foco está no próprio card, não num botão dentro dele.
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
      className={cn(
        "cursor-pointer transition-colors hover:bg-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
      {...props}
    />
  );
}
