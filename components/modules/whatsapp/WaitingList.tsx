import { Users } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatWaiting, waitingTier, type WaitingTier } from "@/lib/whatsapp-shared";
import type { WaitingChat } from "@/lib/whatsapp";

const tierStyles: Record<WaitingTier, string> = {
  ok: "text-text-secondary",
  warn: "text-amber-600",
  late: "text-red-600",
};

function Row({ chat, now }: { chat: WaitingChat; now: number }) {
  const waitingMs = now - chat.awaitingSince.getTime();
  const tier = waitingTier(waitingMs);

  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium text-text-primary">
            {chat.name}
          </span>
          {chat.clientName && chat.clientName !== chat.name ? (
            <Badge>{chat.clientName}</Badge>
          ) : null}
          {chat.unansweredCount > 1 ? (
            <span className="text-xs text-text-secondary">
              {chat.unansweredCount} mensagens
            </span>
          ) : null}
        </div>
        {chat.lastText ? (
          <p className="mt-0.5 line-clamp-2 text-sm text-text-secondary">
            {chat.lastSenderName ? `${chat.lastSenderName}: ` : ""}
            {chat.lastText}
          </p>
        ) : null}
      </div>
      <span
        className={cn("shrink-0 text-sm font-medium tabular-nums", tierStyles[tier])}
        title={`Sem resposta desde ${chat.awaitingSince.toLocaleString("pt-BR")}`}
      >
        {formatWaiting(waitingMs)}
      </span>
    </li>
  );
}

export function WaitingList({
  title,
  chats,
  now,
  group,
}: {
  title: string;
  chats: WaitingChat[];
  now: number;
  group?: boolean;
}) {
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
        {group ? <Users size={16} className="text-text-secondary" /> : null}
        {title}
        <span className="text-xs font-normal text-text-secondary">
          {chats.length}
        </span>
      </h2>
      {chats.length === 0 ? (
        <p className="text-sm text-text-secondary">Nada esperando aqui.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {chats.map((chat) => (
            <Row key={chat.id} chat={chat} now={now} />
          ))}
        </ul>
      )}
    </Card>
  );
}
