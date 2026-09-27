import Link from "next/link";
import { ChevronRight, Radar } from "lucide-react";
import { getRadar } from "@/lib/radar";

/**
 * Aviso do radar na Home: só a contagem e um caminho para a tela.
 *
 * De propósito não lista nada. Abrir a Home e levar uma parede com tudo que
 * você não fez é o jeito mais rápido de parar de abrir a Home — aqui fica só o
 * sinal de que existe algo a decidir, e você encara quando quiser. Some sozinho
 * quando não há nada parado.
 */
export async function RadarHomeNote() {
  const { total } = await getRadar();

  if (total === 0) return null;

  return (
    <Link
      href="/radar"
      className="flex items-center gap-2 rounded-[10px] border border-border bg-surface px-4 py-2.5 text-sm text-text-primary transition-colors hover:bg-hover"
    >
      <Radar size={16} className="shrink-0 text-amber-600" />
      <span className="flex-1">
        <strong className="font-semibold">{total}</strong>{" "}
        {total === 1 ? "coisa parada" : "coisas paradas"} esperando você decidir
      </span>
      <ChevronRight size={16} className="shrink-0 text-text-secondary" />
    </Link>
  );
}
