"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import type { PriorityLevelDTO } from "@/lib/task-plan";

/**
 * A lista de prioridades é da usuária (Configurações), então os modais buscam no
 * servidor em vez de cada tela que os abre ter de repassá-la. Se a busca falhar,
 * o select fica só com "Sem prioridade" e o resto do formulário segue salvando.
 */
export function usePriorityLevels(): PriorityLevelDTO[] {
  const [levels, setLevels] = useState<PriorityLevelDTO[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<PriorityLevelDTO[]>("/api/priority-levels")
      .then((list) => !cancelled && setLevels(list))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return levels;
}
