"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type SyncState = "idle" | "syncing" | "done" | "error";

export function SyncNowButton({
  variant = "primary",
  className,
}: {
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<SyncState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setState("syncing");
    setMessage(null);

    try {
      const response = await fetch("/api/calendar/sync", { method: "POST" });
      const result = await response.json();

      if (!response.ok) {
        setState("error");
        setMessage(result.error ?? "Não foi possível sincronizar.");
        return;
      }

      setState("done");
      setMessage(
        `${result.fromGoogle} ${result.fromGoogle === 1 ? "evento recebido" : "eventos recebidos"}, ` +
          `${result.toGoogle} ${result.toGoogle === 1 ? "enviado" : "enviados"}` +
          (result.errors?.length > 0
            ? ` — ${result.errors.length} com erro`
            : ""),
      );
      router.refresh();
    } catch {
      setState("error");
      setMessage("Não foi possível sincronizar.");
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button variant={variant} onClick={handleSync} disabled={state === "syncing"}>
        <RefreshCw size={14} className={cn(state === "syncing" && "animate-spin")} />
        {state === "syncing" ? "Sincronizando..." : "Sincronizar agora"}
      </Button>

      {message && (
        <span
          className={cn(
            "text-xs",
            state === "error" ? "text-red-600" : "text-text-secondary",
          )}
        >
          {message}
        </span>
      )}
    </div>
  );
}
