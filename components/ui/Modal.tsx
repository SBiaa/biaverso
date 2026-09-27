"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A casca de todo modal do app.
 *
 * Antes cada módulo repetia a mesma marcação à mão (`fixed inset-0` + um `div`
 * com `stopPropagation`), e nenhuma das cópias tinha o que um diálogo precisa
 * ter: Esc não fechava, o foco continuava na página atrás, o Tab passeava pelos
 * links da sidebar e o fundo rolava junto. Tudo isso mora aqui agora.
 *
 * `onSubmit` é o que faz o Enter salvar: com ele o conteúdo vira um `<form>` de
 * verdade, e o botão de salvar do modal só precisa ser `type="submit"`.
 */

type ModalSize = "sm" | "md";

const sizeClass: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
};

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Pilha dos modais abertos. Existe por causa dos aninhados (o seletor de peça
 * abre por cima do pedido): sem ela, um Esc fecharia os dois de uma vez, e o
 * de baixo devolveria o scroll do fundo enquanto o de cima ainda está aberto.
 */
const openModals: symbol[] = [];

function lockBodyScroll() {
  const { body, documentElement } = document;
  const previousOverflow = body.style.overflow;
  const previousPadding = body.style.paddingRight;
  // Sem compensar a barra de rolagem, esconder o scroll alarga a página e o
  // conteúdo inteiro pula alguns pixels para a direita quando o modal abre.
  const scrollbar = window.innerWidth - documentElement.clientWidth;

  body.style.overflow = "hidden";
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

  return () => {
    body.style.overflow = previousOverflow;
    body.style.paddingRight = previousPadding;
  };
}

type ModalProps = {
  title: string;
  onClose: () => void;
  /**
   * Ausente = modal sem formulário (uma lista para escolher, por exemplo).
   * Presente = o conteúdo vira `<form>` e o Enter dispara isto.
   */
  onSubmit?: () => void;
  size?: ModalSize;
  /** Some com o X do cabeçalho — para confirmações, onde a saída é explícita. */
  hideCloseButton?: boolean;
  /** Onde o foco deve pousar ao abrir, quando o primeiro campo não serve. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * `false` quando o conteúdo já tem a própria área rolável (uma lista longa
   * abaixo de um campo de busca fixo). Sem isso ficam duas barras de rolagem.
   */
  scrollBody?: boolean;
  className?: string;
  children: ReactNode;
};

export function Modal({
  title,
  onClose,
  onSubmit,
  size = "sm",
  hideCloseButton = false,
  initialFocusRef,
  scrollBody = true,
  className,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const idRef = useRef<symbol>(undefined as unknown as symbol);
  if (idRef.current === undefined) idRef.current = Symbol("modal");

  // Em ref para o efeito de montagem não depender da identidade da função:
  // quase todo chamador passa uma arrow nova a cada render, e o efeito
  // remontaria (roubando o foco de volta) a cada tecla digitada.
  const onCloseRef = useRef(onClose);
  const initialFocusTargetRef = useRef(initialFocusRef);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    initialFocusTargetRef.current = initialFocusRef;
  });

  useEffect(() => {
    const id = idRef.current;
    openModals.push(id);
    const releaseScroll = openModals.length === 1 ? lockBodyScroll() : () => {};
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // O primeiro campo, e não o primeiro focável: senão o foco cai no X do
    // cabeçalho e quem abriu o modal para digitar precisa dar um Tab antes.
    const panel = panelRef.current;
    const firstField = panel?.querySelector<HTMLElement>(
      "input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled])",
    );
    (
      initialFocusTargetRef.current?.current ??
      firstField ??
      panel?.querySelector<HTMLElement>(FOCUSABLE) ??
      panel
    )?.focus();

    return () => {
      const index = openModals.indexOf(id);
      if (index !== -1) openModals.splice(index, 1);
      releaseScroll();
      // De volta para o botão que abriu o modal, senão o Tab seguinte recomeça
      // do topo da página.
      previouslyFocused?.focus?.();
    };
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Só o modal do topo responde ao Esc.
    if (openModals[openModals.length - 1] !== idRef.current) return;

    if (event.key === "Escape") {
      event.stopPropagation();
      onCloseRef.current();
      return;
    }

    if (event.key !== "Tab") return;

    const panel = panelRef.current;
    if (!panel) return;
    const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    // O Tab dá a volta dentro do modal em vez de vazar para a página atrás.
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2
          id={titleId}
          className="text-sm font-semibold text-text-primary"
        >
          {title}
        </h2>
        {!hideCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            // -mr-2 para o alvo de 44px crescer para fora, sem empurrar o
            // título nem descolar o ícone da borda do modal.
            className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-hover-strong hover:text-text-primary"
          >
            <X size={18} />
          </button>
        )}
      </div>
      {children}
    </>
  );

  return (
    // No celular o modal sobe do rodapé como uma folha: centralizado, um modal
    // alto encosta nas duas bordas e o teclado virtual empurra tudo para cima.
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      // `mousedown` no lugar de `click`: selecionar um texto de dentro e soltar
      // o mouse fora fechava o modal e perdia o que estava escrito.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "flex max-h-[85vh] w-full flex-col gap-3 bg-surface p-4 outline-none",
          scrollBody ? "overflow-y-auto" : "overflow-hidden",
          "rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-xl sm:pb-4",
          sizeClass[size],
          className,
        )}
      >
        {onSubmit ? (
          <form
            className="flex min-h-0 flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            // O Enter é disparado à mão em vez de depender do envio implícito
            // do navegador: ele só vale quando o formulário tem exatamente um
            // campo de texto ou um botão de envio "padrão", e basta um modal
            // ganhar um segundo campo para o Enter parar de funcionar sem que
            // ninguém perceba.
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey) return;
              const target = e.target as HTMLElement;
              // Textarea precisa da quebra de linha; botão e link já têm a
              // própria ação no Enter.
              if (
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLButtonElement ||
                target instanceof HTMLAnchorElement
              ) {
                return;
              }
              e.preventDefault();
              e.currentTarget.requestSubmit();
            }}
          >
            {content}
          </form>
        ) : (
          content
        )}
      </div>
    </div>
  );
}

/** Estilo padrão dos campos dentro de um modal. */
export const fieldClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent";

/** Rótulo + campo. O `<label>` envolve o controle, então o clique no texto foca. */
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

/** Linha de ações do rodapé de um modal. */
export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex gap-2">{children}</div>;
}
