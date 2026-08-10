"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";

/** Intervalo do polling automático. */
export const SYNC_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Sincroniza com o Google Calendar a cada 5 minutos enquanto o app está aberto.
 * Falhas são engolidas de propósito: a sincronização roda em segundo plano e não
 * pode atrapalhar o uso do app. O status fica visível em Configurações.
 */
export function useCalendarSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const result = await api.post<{ fromGoogle: number; toGoogle: number }>(
          "/api/calendar/sync",
          {},
        );
        if (cancelled) return;

        // Só recarrega a tela se alguma coisa mudou de fato.
        if (result.fromGoogle > 0 || result.toGoogle > 0) router.refresh();
      } catch {
        // Google não conectado, sem rede ou sync já em andamento: a próxima
        // rodada tenta de novo. O status fica visível em Configurações.
      }
    }

    const interval = setInterval(sync, SYNC_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);
}
