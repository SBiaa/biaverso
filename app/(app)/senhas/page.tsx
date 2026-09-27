import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { AddPasswordForm } from "@/components/modules/senhas/AddPasswordForm";
import { PasswordRow } from "@/components/modules/senhas/PasswordRow";
import { passwordCategoryLabels } from "@/lib/labels";
import { decryptEntry } from "@/lib/passwords";

export const dynamic = "force-dynamic";

export default async function SenhasPage() {
  const entries = (
    await prisma.passwordEntry.findMany({ orderBy: { name: "asc" } })
  ).map(decryptEntry);

  const categories = Object.keys(passwordCategoryLabels);
  const grouped = categories
    .map((category) => ({
      category,
      items: entries.filter((e) => e.category === category),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <Topbar title="Senhas" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <div className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-xs text-text-secondary">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
          <span>
            As senhas ficam criptografadas no banco (AES-256-GCM). Quem entra no
            app com a senha de acesso continua vendo tudo — é para isso que o
            cofre serve.
          </span>
        </div>

        <AddPasswordForm />

        {grouped.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nenhuma senha cadastrada ainda.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {grouped.map((group) => (
              <div key={group.category} className="flex flex-col gap-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  {passwordCategoryLabels[group.category]}
                </h2>
                {group.items.map((item) => (
                  <PasswordRow
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    login={item.login}
                    password={item.password}
                    url={item.url}
                    category={item.category}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
