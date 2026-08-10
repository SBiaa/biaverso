import { AlertCircle } from "lucide-react";

/** Aviso inline de falha ao salvar. Some sozinho quando a ação dá certo. */
export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p
      role="status"
      className="flex items-center gap-1.5 text-xs font-medium text-red-600"
    >
      <AlertCircle size={13} className="shrink-0" />
      {message}
    </p>
  );
}
