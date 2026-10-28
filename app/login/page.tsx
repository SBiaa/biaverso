import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { safeReturnPath } from "@/lib/session";

export const metadata: Metadata = { title: "Entrar · biaVerso" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string }>;
}) {
  const { de } = await searchParams;

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-accent text-xl font-bold text-accent-contrast shadow-elevation">
            b
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              biaVerso
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Digite a senha para entrar.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-elevation">
          <LoginForm returnTo={safeReturnPath(de)} />
        </div>
      </div>
    </main>
  );
}
