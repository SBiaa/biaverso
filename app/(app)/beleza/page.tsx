import { Topbar } from "@/components/layout/Topbar";
import { cardColumns } from "@/components/layout/page-width";
import { Card, CardTitle } from "@/components/ui";
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
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <BelezaSubNav />

        <div className={cardColumns}>
          <Card>
            <CardTitle>Hoje</CardTitle>
            <p className="mb-3 text-xs text-text-secondary">
              {formatDateLongBR(today)}
            </p>
            <TodayRoutines routines={routines} date={today.toISOString()} />
          </Card>

          <Card>
            <CardTitle className="mb-3">
              Cronogramas ativos
            </CardTitle>
            <ActiveSchedules schedules={schedules} />
          </Card>

          <Card>
            <CardTitle className="mb-3">
              Cuidados pendentes
            </CardTitle>
            <PendingAppointments appointments={appointments} />
          </Card>

          <Card>
            <CardTitle className="mb-3">
              Produtos abrindo e vencendo
            </CardTitle>
            <ProductAlerts
              expiring={productAlerts.expiring}
              runningLow={productAlerts.runningLow}
            />
          </Card>
        </div>
      </main>
    </>
  );
}
