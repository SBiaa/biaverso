import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-contrast hover:bg-accent/90",
  secondary:
    "bg-surface border border-border text-text-primary hover:bg-hover",
  ghost: "text-text-primary hover:bg-hover",
  danger: "bg-danger-solid-bg text-danger-solid-text hover:opacity-90",
};

// `ComponentPropsWithRef` e não `ButtonHTMLAttributes`: o `ref` entra junto com
// o resto das props (React 19), e o diálogo de confirmação precisa dele para
// pousar o foco no "Cancelar".
type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
};

export function Button({
  variant = "primary",
  className,
  // Sem isto, um botão dentro de `<form>` vira submit por padrão — e o
  // "Cancelar" de todo modal passaria a salvar. Quem quer submeter pede.
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

/**
 * Botão só de ícone (editar, excluir, mover).
 *
 * O ícone continua com 14–16px, mas a área que responde ao toque tem 44px: as
 * listas do app tinham botões de 14×14 encostados uns nos outros, e no celular
 * acertar "editar" sem pegar "excluir" era sorte.
 */
export function IconButton({
  className,
  type = "button",
  tone = "default",
  revealOnHover = false,
  ...props
}: ComponentPropsWithRef<"button"> & {
  tone?: "default" | "danger";
  /**
   * Some até o mouse chegar na linha (o pai precisa ter `group`).
   *
   * Numa lista de quinze itens, lápis e lixeira sempre visíveis são trinta
   * ícones disputando atenção com o texto. Só vale onde existe mouse: o
   * `@media (hover: hover)` deixa tudo à vista no celular, onde "chegar por
   * cima" não existe e um botão invisível seria um botão perdido.
   */
  revealOnHover?: boolean;
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors sm:size-9",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        "disabled:pointer-events-none disabled:opacity-50",
        revealOnHover &&
          "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:transition-opacity " +
            "group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100",
        tone === "danger"
          ? "text-text-secondary hover:bg-danger-soft-bg hover:text-danger"
          : "text-text-secondary hover:bg-hover-strong hover:text-text-primary",
        className,
      )}
      {...props}
    />
  );
}
