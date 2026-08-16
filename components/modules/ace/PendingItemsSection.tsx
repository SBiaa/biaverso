import { AttentionBadge, Card, CardTitle } from "@/components/ui";
import { formatDateBR } from "@/lib/utils";
import type { PendingItem } from "@/lib/ace";

export function PendingItemsSection({ items }: { items: PendingItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      <CardTitle>Pendentes</CardTitle>
      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">Nada pendente para este cliente.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => (
            <Card
              key={`${item.kind}-${item.id}`}
              className="flex items-center justify-between gap-2 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-border px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                  {item.kind === "post" ? "Post" : "Produção"}
                </span>
                <div>
                  <p className="text-sm text-text-primary">{item.title}</p>
                  <p className="text-xs text-text-secondary">
                    {item.statusLabel}
                    {item.projectName ? ` · ${item.projectName}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.overdue && (
                  <AttentionBadge level="atrasado">
                    Atrasado
                  </AttentionBadge>
                )}
                <span className="text-xs text-text-secondary">
                  {item.dueOrPublishDate ? formatDateBR(new Date(item.dueOrPublishDate)) : "Sem data"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
