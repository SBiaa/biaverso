import Link from "next/link";
import { Card, CardTitle } from "@/components/ui";
import { formatDateLongBR } from "@/lib/utils";
import { formatTimeBR } from "@/lib/astros";
import type { Sabbat } from "@/lib/espiritual-shared";

/** O próximo sabbath, com a contagem e o que ele pede. */
export function SabbatCard({
  sabbat,
  daysAway,
}: {
  sabbat: Sabbat;
  daysAway: number;
}) {
  const countdown =
    daysAway === 0
      ? "É hoje"
      : daysAway === 1
        ? "É amanhã"
        : `Faltam ${daysAway} dias`;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <CardTitle>Próximo sabbath</CardTitle>
        <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
          {countdown}
        </span>
      </div>

      <div>
        <p className="text-xl font-semibold tracking-tight text-text-primary">
          {sabbat.name}
        </p>
        {sabbat.alsoKnownAs && (
          <p className="text-xs text-text-secondary">{sabbat.alsoKnownAs}</p>
        )}
      </div>

      <p className="text-sm text-text-primary">
        {formatDateLongBR(sabbat.date)}
        {/* A hora só existe nos solares: nos do fogo a data é convenção, e um
            horário ali seria precisão inventada. */}
        {sabbat.at && (
          <span className="text-text-secondary"> · {formatTimeBR(sabbat.at)}</span>
        )}
        {sabbat.nightInto && (
          <span className="text-text-secondary">
            {" "}
            · a noite entra em {sabbat.nightInto}
          </span>
        )}
      </p>

      <div className="flex flex-col gap-1 border-t border-border/60 pt-3 text-sm">
        <p className="text-text-secondary">{sabbat.season}</p>
        <p className="text-text-primary">{sabbat.work}</p>
      </div>

      <Link
        href="/espiritual/roda"
        className="w-fit text-xs font-medium text-accent"
      >
        Ver a roda inteira
      </Link>
    </Card>
  );
}
