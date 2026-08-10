"use client";

import { useEffect } from "react";

/**
 * Último recurso: só dispara se o próprio RootLayout quebrar, quando o
 * `app/error.tsx` já não tem onde renderizar. Por isso repete <html>/<body>
 * e não usa nada do design system (que pode ser justamente o que falhou).
 */
export default function GlobalError({
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
    <html lang="pt-BR">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          color: "#1a1a1a",
          background: "#fafafa",
        }}
      >
        <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>
          O app não conseguiu carregar
        </h1>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: "0.5rem",
            background: "#6366f1",
            color: "#fff",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
