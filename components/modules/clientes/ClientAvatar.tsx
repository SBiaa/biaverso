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
  client: { name: string; color: string | null; photo?: string | null };
  size?: "md" | "lg";
  className?: string;
}) {
  const color = getClientColor(client);
  if (client.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URL, nada a otimizar
      <img
        src={client.photo}
        alt={client.name}
        className={cn(
          "shrink-0 rounded-full object-cover",
          size === "md" && "size-9",
          size === "lg" && "size-14",
          className,
        )}
      />
    );
  }
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
