import { Calendar, Droplet, Sparkles } from "lucide-react";
import { Card, CardTitle, StatCard } from "@/components/ui";
import { cyclePhaseLabels } from "@/lib/labels";
import { formatDateBR } from "@/lib/utils";
import type { CycleNowView } from "@/lib/ciclo-shared";
import { PhasePill, relativeDayLabel } from "./shared";

export function CycleStatusCard({ cycleNow }: { cycleNow: CycleNowView }) {
  if (!cycleNow.hasHistory) {
    return (
      <Card>
        <CardTitle className="mb-2">Ciclo</CardTitle>
        <p className="text-sm text-text-secondary">
          Registre o primeiro dia da sua menstruação para começar a acompanhar
          o ciclo — a partir do segundo período, o app já estima quando a
          próxima chega.
        </p>
      </Card>
    );
  }

  const { phase, cycleDay, isLate, daysLate, isEstimate, cycleLength } = cycleNow;

  return (
    <div className="flex flex-col gap-3">
      {isLate && (
        <Card className="border-l-4 border-l-danger text-sm text-text-primary">
          A menstruação prevista está atrasada{" "}
          {daysLate === 1 ? "há 1 dia" : `há ${daysLate} dias`}. Se ela já
          começou, registre no dia de hoje.
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Dia do ciclo"
          value={cycleDay}
          icon={<Calendar size={16} className="text-text-secondary" />}
        />
        <StatCard
          label="Fase"
          value={phase ? <PhasePill phase={phase} label={cyclePhaseLabels[phase]} /> : "—"}
          icon={<Sparkles size={16} className="text-text-secondary" />}
        />
        <StatCard
          label="Próxima menstruação"
          value={
            cycleNow.nextPeriodStart
              ? relativeDayLabel(cycleNow.daysUntilNextPeriod ?? 0)
              : "—"
          }
          valueClassName="text-lg"
          icon={<Droplet size={16} className="text-text-secondary" />}
        />
        <StatCard
          label="Ovulação"
          value={
            cycleNow.ovulationDate
              ? relativeDayLabel(cycleNow.daysUntilOvulation ?? 0)
              : "—"
          }
          valueClassName="text-lg"
        />
      </div>

      <p className="text-xs text-text-secondary">
        {isEstimate
          ? `Ciclo estimado em ${cycleLength} dias — o padrão até haver histórico suficiente.`
          : `Duração média do ciclo: ${cycleLength} dias, calculada pelos últimos períodos.`}
        {cycleNow.nextPeriodStart &&
          ` Próxima prevista para ${formatDateBR(new Date(cycleNow.nextPeriodStart))}.`}
      </p>
    </div>
  );
}
