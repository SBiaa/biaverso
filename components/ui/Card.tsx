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
