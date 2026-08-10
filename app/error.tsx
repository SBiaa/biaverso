"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle size={32} className="text-red-600" />
      <div>
        <h1 className="text-lg font-semibold text-text-primary">
          Alguma coisa quebrou aqui
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          O resto do app continua funcionando. Tente carregar esta tela de novo.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Tentar de novo
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary"
        >
          Voltar para a Home
        </Link>
      </div>
      {error.digest && (
        <p className="font-mono text-xs text-text-secondary">
          código do erro: {error.digest}
        </p>
      )}
    </main>
  );
}
