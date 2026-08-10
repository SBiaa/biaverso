"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

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
        const response = await fetch("/api/calendar/sync", { method: "POST" });
        if (!response.ok || cancelled) return;

        const result = await response.json();
        // Só recarrega a tela se alguma coisa mudou de fato.
        if (result.fromGoogle > 0 || result.toGoogle > 0) router.refresh();
      } catch {
        // Sem conexão ou sync já em andamento: a próxima rodada tenta de novo.
      }
    }

    const interval = setInterval(sync, SYNC_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);
}
