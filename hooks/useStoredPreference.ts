"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Uma preferência de tela guardada no `localStorage` (a visão da agenda, as
 * colunas recolhidas do kanban).
 *
 * `useSyncExternalStore` e não `useState` + `useEffect`: o servidor e a
 * primeira pintura usam o `fallback`, o valor salvo entra logo em seguida sem
 * erro de hidratação, e todo componente que lê a mesma chave anda junto.
 *
 * O valor é sempre string — o snapshot é comparado por identidade, e uma
 * string não muda de identidade a cada leitura como um array mudaria.
 */

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Cópia em memória: com o storage bloqueado a escolha ainda vale até recarregar. */
const memory = new Map<string, string>();

function read(key: string) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    // Storage bloqueado (aba anônima, cookies desligados).
    return memory.get(key) ?? null;
  }
}

export function useStoredPreference(key: string, fallback: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key) ?? fallback,
    () => fallback,
  );

  const setValue = useCallback(
    (next: string) => {
      memory.set(key, next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // Fica só a cópia em memória.
      }
      listeners.forEach((listener) => listener());
    },
    [key],
  );

  return [value, setValue] as const;
}
