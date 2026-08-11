import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { BelezaSubNav } from "@/components/modules/beleza/BelezaSubNav";
import { TodayRoutines } from "@/components/modules/beleza/TodayRoutines";
import { ActiveSchedules } from "@/components/modules/beleza/ActiveSchedules";
import { PendingAppointments } from "@/components/modules/beleza/PendingAppointments";
import { ProductAlerts } from "@/components/modules/beleza/ProductAlerts";
import {
  getAppointments,
  getProductAlerts,
  getRoutinesForDay,
  getSchedules,
} from "@/lib/beleza";
import { formatDateLongBR, todayUtc } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BelezaPage() {
  const today = todayUtc();

  const [routines, schedules, appointments, productAlerts] = await Promise.all([
    getRoutinesForDay(today),
    getSchedules({ onlyActive: true }),
    getAppointments(),
    getProductAlerts(today),
  ]);

  return (
    <>
      <Topbar title="Beleza e autocuidado" />
      <main className="flex-1 space-y-4 p-4 md:p-6 md:max-w-3xl">
        <div className="md:hidden">
          <h1 className="text-lg font-semibold text-text-primary">
            Beleza e autocuidado
          </h1>
        </div>

        <BelezaSubNav />

        <Card>
          <h2 className="text-sm font-semibold text-text-primary">Hoje</h2>
          <p className="mb-3 text-xs text-text-secondary">
            {formatDateLongBR(today)}
          </p>
          <TodayRoutines routines={routines} date={today.toISOString()} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">
            Cronogramas ativos
          </h2>
          <ActiveSchedules schedules={schedules} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">
            Cuidados pendentes
          </h2>
          <PendingAppointments appointments={appointments} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">
            Produtos abrindo e vencendo
          </h2>
          <ProductAlerts
            expiring={productAlerts.expiring}
            runningLow={productAlerts.runningLow}
          />
        </Card>
      </main>
    </>
  );
}
