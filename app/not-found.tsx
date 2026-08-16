import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <Compass size={32} className="text-text-secondary" />
      <div>
        <h1 className="text-lg font-semibold text-text-primary">
          Não achei essa página
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Ela pode ter sido apagada, ou o link está errado.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast"
      >
        Voltar para a Home
      </Link>
    </main>
  );
}
