import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // A sombra é quase invisível de perto e faz toda a diferença de longe:
        // sobre o cinza do fundo, só a borda deixava os cards rentes à tela.
        // O padding cresce no desktop — 16px numa caixa de 600px de largura
        // aperta o conteúdo contra a borda.
        "rounded-xl border border-border bg-surface p-4 shadow-elevation md:p-5",
        className,
      )}
      {...props}
    />
  );
}
