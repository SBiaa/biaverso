"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Modal, ModalActions } from "./Modal";

/**
 * Confirmação de ação, no lugar do `confirm()` do navegador.
 *
 * O nativo era usado em 31 lugares: caixa cinza do Chrome, fora da identidade
 * do app, sem diferença nenhuma entre "excluir para sempre" e uma ação leve, e
 * no celular colada no topo da tela.
 *
 * A API imita a do nativo de propósito, para a troca ser linha a linha:
 *
 *     const confirm = useConfirm();
 *     if (!(await confirm({ title: "Apagar?" }))) return;
 */

export type ConfirmOptions = {
  title: string;
  /** Linha de apoio: o que exatamente acontece, e se dá para desfazer. */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Pinta o botão de vermelho e põe o ícone de aviso. */
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * O mesmo diálogo, chamável de fora de um componente.
 *
 * Existe porque metade dos `confirm()` que ele substitui mora dentro de uma
 * arrow function no meio de um `onClick` — lugar onde não dá para chamar hook.
 * O provider é montado uma vez só, na raiz, então o registro é único.
 */
let mountedConfirm: ConfirmFn | null = null;

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (!mountedConfirm) {
    // Sem provider (SSR, teste), a ação não acontece — melhor não fazer nada
    // do que apagar algo sem ter perguntado.
    return Promise.resolve(false);
  }
  return mountedConfirm(options);
}

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Guarda o `resolve` do pedido atual para o unmount conseguir responder
  // `false` — sem isso um `await confirm(...)` ficaria pendurado para sempre.
  const pendingRef = useRef<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      const entry = { ...options, resolve };
      pendingRef.current = entry;
      setPending(entry);
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    pendingRef.current?.resolve(value);
    pendingRef.current = null;
    setPending(null);
  }, []);

  useEffect(() => {
    mountedConfirm = confirm;
    return () => {
      mountedConfirm = null;
    };
  }, [confirm]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <Modal
          title={pending.title}
          size="sm"
          hideCloseButton
          onClose={() => settle(false)}
          // Enter confirma, Esc cancela — o mesmo que o diálogo nativo fazia.
          onSubmit={() => settle(true)}
          // Numa exclusão o foco começa em "Cancelar": abrir o diálogo e
          // apertar Enter por reflexo não pode apagar nada.
          initialFocusRef={pending.destructive ? cancelRef : undefined}
        >
          {pending.description && (
            <div className="flex items-start gap-2.5 text-sm text-text-secondary">
              {pending.destructive && (
                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0 text-danger"
                />
              )}
              <div className="min-w-0">{pending.description}</div>
            </div>
          )}
          <ModalActions>
            <Button
              type="submit"
              variant={pending.destructive ? "danger" : "primary"}
            >
              {pending.confirmLabel ??
                (pending.destructive ? "Excluir" : "Confirmar")}
            </Button>
            <Button ref={cancelRef} variant="ghost" onClick={() => settle(false)}>
              {pending.cancelLabel ?? "Cancelar"}
            </Button>
          </ModalActions>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm precisa estar dentro de <ConfirmProvider>.");
  }
  return context;
}
