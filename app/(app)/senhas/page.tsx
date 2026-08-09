import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { AddPasswordForm } from "@/components/modules/senhas/AddPasswordForm";
import { PasswordRow } from "@/components/modules/senhas/PasswordRow";
import { passwordCategoryLabels } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function SenhasPage() {
  const entries = await prisma.passwordEntry.findMany({
    orderBy: { name: "asc" },
  });

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
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex items-start gap-2 rounded-lg border border-badge-ace-text/20 bg-badge-ace-bg p-3 text-xs text-badge-ace-text">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Nesta v1 as senhas são salvas em texto simples, sem criptografia.
            Use este cofre apenas neste ambiente local/pessoal — a
            criptografia está planejada para uma versão futura.
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
                    name={item.name}
                    login={item.login}
                    password={item.password}
                    url={item.url}
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
