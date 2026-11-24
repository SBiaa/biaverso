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
import { AlertCircle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Confirmação visual das ações.
 *
 * O app tinha `ErrorNote` para quando dava errado e nada para quando dava
 * certo: salvar fechava o modal e pronto, sem nenhum sinal de que gravou. Isso
 * é o aviso curto que aparece depois de salvar, marcar ou excluir.
 */

type ToastTone = "success" | "error";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS = 3200;

/**
 * O mesmo aviso, chamável de fora de um componente — inclusive de dentro de um
 * `onClick` inline, onde não cabe hook. O provider é único, na raiz.
 */
let mountedToast: ToastContextValue["toast"] | null = null;

export function notify(message: string, tone: ToastTone = "success") {
  mountedToast?.(message, tone);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, tone }]);
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, DURATION_MS),
      );
    },
    [],
  );

  useEffect(() => {
    mountedToast = toast;
    return () => {
      mountedToast = null;
    };
  }, [toast]);

  // Um modal fechando enquanto o timer corre deixaria o setTimeout pendurado.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* No celular os avisos sobem acima da barra de navegação de baixo, que
          é fixa e cobriria os primeiros 64px. */}
      <div
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2",
          "px-4 pb-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)]",
          "md:items-end md:pb-6 md:pr-6",
        )}
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border px-3.5 py-3",
              "shadow-lg [animation:toast-in_180ms_ease-out]",
              item.tone === "success"
                ? "border-success bg-success-soft-bg text-success-soft-text"
                : "border-danger bg-danger-soft-bg text-danger-soft-text",
            )}
          >
            {item.tone === "success" ? (
              <Check size={16} className="shrink-0 text-success" />
            ) : (
              <AlertCircle size={16} className="shrink-0 text-danger" />
            )}
            <span className="flex-1 text-sm font-medium">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Fechar aviso"
              className="-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-md opacity-60 transition-opacity hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * `toast("Rotina salva")` para sucesso, `toast(msg, "error")` para falha.
 *
 * Fora do provider vira no-op em vez de quebrar: assim um componente pode
 * chamar o toast sem exigir que toda árvore de teste monte o provider.
 */
export function useToast() {
  const context = useContext(ToastContext);
  const fallback = useCallback(() => {}, []);
  return context?.toast ?? fallback;
}
