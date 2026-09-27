import { cn, getInitials } from "@/lib/utils";
import { getClientColor } from "@/lib/client-visuals";

/**
 * Bolinha com as iniciais da clienta, na cor dela — a mesma que pinta os
 * cards no calendário, pra reconhecer a clienta pela cor em qualquer tela.
 */
export function ClientAvatar({
  client,
  size = "md",
  className,
}: {
  client: { name: string; color: string | null };
  size?: "md" | "lg";
  className?: string;
}) {
  const color = getClientColor(client);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "md" && "size-9 text-sm",
        size === "lg" && "size-14 text-lg",
        className,
      )}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      {getInitials(client.name)}
    </div>
  );
}
