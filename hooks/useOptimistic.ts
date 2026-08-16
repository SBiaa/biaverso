"use client";

import { startTransition, useOptimistic, useState } from "react";
import { useRouter } from "next/navigation";
import { errorMessage } from "@/lib/client-api";

/**
 * O padrão "marca na hora, desfaz se falhar", num lugar só.
 *
 * Estava copiado em quase quarenta componentes, sempre assim:
 *
 *     const [items, setItems] = useState(initialItems);
 *     const previous = items;
 *     setItems(otimista);
 *     try { await api.patch(...) } catch { setItems(previous); setError(...) }
 *
 * Além da repetição, esse molde tem um defeito silencioso: `useState(props)` lê
 * as props UMA vez. Quando outra parte da tela mexe no mesmo dado e chama
 * `router.refresh()`, o servidor manda a lista nova e este componente continua
 * mostrando a antiga — as duas versões do mesmo hábito na mesma tela.
 *
 * `useOptimistic` resolve os dois: o estado de base é sempre o que veio do
 * servidor, a alteração otimista vale só enquanto a transição está em pé, e o
 * descarte no fim dela é o próprio rollback — não precisa guardar o valor
 * anterior à mão.
 */

type Identified = { id: string };

/** Uma lista de itens em que se altera um de cada vez (marcar, desmarcar). */
export function useOptimisticList<T extends Identified>(serverItems: T[]) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [items, applyPatch] = useOptimistic(
    serverItems,
    (current: T[], patch: { id: string; changes: Partial<T> }) =>
      current.map((item) =>
        item.id === patch.id ? { ...item, ...patch.changes } : item,
      ),
  );

  /**
   * `save` faz a chamada de rede. Se ela estourar, a transição termina sem
   * refresh, o valor otimista é descartado e a lista volta sozinha ao que o
   * servidor tinha.
   */
  function update(id: string, changes: Partial<T>, save: () => Promise<unknown>) {
    startTransition(async () => {
      applyPatch({ id, changes });
      setError(null);
      try {
        await save();
        router.refresh();
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  }

  return { items, error, update, setError };
}

/** Um valor só (o status de uma ideia, o humor do dia, o tipo do dia). */
export function useOptimisticValue<T>(serverValue: T) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [value, applyValue] = useOptimistic(serverValue, (_: T, next: T) => next);

  function update(next: T, save: () => Promise<unknown>) {
    startTransition(async () => {
      applyValue(next);
      setError(null);
      try {
        await save();
        router.refresh();
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  }

  return { value, error, update, setError };
}
