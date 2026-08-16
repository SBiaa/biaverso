"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardTitle, confirmAction } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { GoogleSyncStatus } from "@/lib/agenda-shared";
import { SyncNowButton } from "./SyncNowButton";

/** Mensagens devolvidas pelo callback do OAuth via `?google=`. */
const FEEDBACK: Record<string, { text: string; error: boolean }> = {
  conectado: { text: "Google Calendar conectado.", error: false },
  negado: { text: "Autorização cancelada no Google.", error: true },
  state: {
    text: "A autorização não pôde ser verificada. Tente conectar novamente.",
    error: true,
  },
  sem_refresh: {
    text:
      "O Google não devolveu a permissão de renovação. Remova o acesso do app em " +
      "myaccount.google.com/permissions e conecte de novo.",
    error: true,
  },
  config: {
    text: "Credenciais do Google não configuradas no .env — veja o README.",
    error: true,
  },
  erro: { text: "Não foi possível conectar ao Google Calendar.", error: true },
};

function formatDateTimeBR(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GoogleCalendarCard({
  status,
  feedback,
}: {
  status: GoogleSyncStatus;
  feedback?: string;
}) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const message = feedback ? FEEDBACK[feedback] : undefined;

  async function handleDisconnect() {
    const confirmed = await confirmAction({
      title: "Desconectar o Google Calendar?",
      description: "Os eventos já sincronizados continuam no app.",
      confirmLabel: "Desconectar",
      destructive: true,
    });
    if (!confirmed) return;

    setDisconnecting(true);
    setError(null);
    try {
      await api.post("/api/calendar/disconnect", {});
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Google Calendar</CardTitle>

      {message && (
        <p className={cn("text-xs", message.error ? "text-red-600" : "text-emerald-600")}>
          {message.text}
        </p>
      )}

      {!status.connected ? (
        <>
          <p className="text-sm text-text-secondary">
            Conecte sua conta para que os eventos da agenda apareçam no Google
            Calendar e vice-versa.
          </p>
          <div>
            {/* Link comum: o fluxo OAuth é uma navegação, não um fetch. */}
            <a
              href="/api/auth/google"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Conectar Google Calendar
            </a>
          </div>
        </>
      ) : (
        <>
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-secondary">Conta</dt>
              <dd className="truncate text-text-primary">
                {status.email ?? "conectada"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-secondary">Última sincronização</dt>
              <dd className="text-text-primary">
                {status.lastSync
                  ? formatDateTimeBR(status.lastSync.syncedAt)
                  : "ainda não sincronizado"}
              </dd>
            </div>
            {status.lastSync && (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-text-secondary">Resultado</dt>
                <dd className="text-text-primary">
                  {status.lastSync.eventsFrom} recebidos, {status.lastSync.eventsTo}{" "}
                  enviados
                </dd>
              </div>
            )}
            {status.pendingCount > 0 && (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-text-secondary">Aguardando envio</dt>
                <dd className="text-text-primary">
                  {status.pendingCount}{" "}
                  {status.pendingCount === 1 ? "evento" : "eventos"}
                </dd>
              </div>
            )}
          </dl>

          {status.lastSync?.errors && (
            <details className="text-xs text-text-secondary">
              <summary className="cursor-pointer text-red-600">
                Erros na última sincronização
              </summary>
              <pre className="mt-1 whitespace-pre-wrap break-words">
                {status.lastSync.errors}
              </pre>
            </details>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <SyncNowButton />
            <Button
              variant="secondary"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? "Desconectando..." : "Desconectar"}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
