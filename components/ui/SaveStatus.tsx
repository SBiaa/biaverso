"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveState = "idle" | "saving" | "saved";

/**
 * Estado do salvamento automático. `track` embrulha a gravação: mostra
 * "Salvando…" enquanto ela roda e "Salvo" por 2s quando dá certo. Se falhar,
 * volta ao neutro — o erro em si é mostrado pelo `ErrorNote` de quem chamou.
 */
export function useSaveStatus() {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Duas gravações seguidas: só a última decide o que aparece.
  const latest = useRef(0);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const track = useCallback(async <T,>(work: Promise<T>): Promise<T> => {
    const id = ++latest.current;
    if (timer.current) clearTimeout(timer.current);
    setState("saving");
    try {
      const result = await work;
      if (id === latest.current) {
        setState("saved");
        timer.current = setTimeout(() => setState("idle"), 2000);
      }
      return result;
    } catch (error) {
      if (id === latest.current) setState("idle");
      throw error;
    }
  }, []);

  return { state, track };
}

/** O mesmo aviso de salvamento automático em todas as telas. */
export function SaveStatus({ state, className }: { state: SaveState; className?: string }) {
  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex min-h-4 items-center gap-1 text-xs",
        state === "saved" ? "text-accent" : "text-text-secondary",
        className,
      )}
    >
      {state === "saving" && "Salvando…"}
      {state === "saved" && (
        <>
          <Check size={14} /> Salvo
        </>
      )}
    </span>
  );
}
