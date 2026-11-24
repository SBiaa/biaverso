import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * O título de um card.
 *
 * Era `text-sm font-semibold` escrito à mão em ~75 lugares — o mesmo 14px do
 * texto do corpo, então o olho não tinha onde pousar primeiro dentro do card.
 * Um degrau acima (15px) já separa título de conteúdo, e ter um componente
 * significa poder mexer nessa régua num arquivo só em vez de setenta e cinco.
 *
 * A margem NÃO entra aqui de propósito: metade dos títulos vive dentro de um
 * cabeçalho `flex` onde o espaçamento vem do pai, e uma margem embutida
 * empurraria o botão que fica ao lado.
 */
export function CardTitle<T extends ElementType = "h2">({
  as,
  className,
  children,
  ...props
}: {
  as?: T;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">) {
  const Tag = (as ?? "h2") as ElementType;

  return (
    <Tag
      className={cn(
        "text-[0.9375rem] font-semibold tracking-tight text-text-primary",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
