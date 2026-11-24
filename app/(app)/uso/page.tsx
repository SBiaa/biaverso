import { getUsageReport } from "@/lib/uso";
import { usageModules } from "@/lib/uso-modulos";
import { formatDateBR, parseIntParam, todayUtc } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Card, MonthPicker, StatCard } from "@/components/ui";
import {
  RaioXCard,
  UsageModulesCard,
  UsageSuggestionsCard,
} from "@/components/modules/uso/UsageCards";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string; year?: string }>;

const hrefFor = (key: string) => usageModules.find((m) => m.key === key)?.href ?? "/";

/** Como ela usou o próprio biaVerso no mês, e o que dá para melhorar nele. */
export default async function UsoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const today = todayUtc();
  const month = parseIntParam(params.month, 1, 12) ?? today.getUTCMonth() + 1;
  const year = parseIntParam(params.year, 1970, 2999) ?? today.getUTCFullYear();

  const report = await getUsageReport(month, year);
  const untouched = report.modules.filter(
    (m) => m.key !== "home" && m.views === 0 && m.actions === 0 && m.records === 0,
  );

  return (
    <>
      <Topbar width="narrow" title="Uso do biaVerso" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <MonthPicker month={month} year={year} />

        {/* Antes de existir registro, só o raio-x tem o que dizer: avisa para
            ela não ler "0 visitas" como "não usei". */}
        {!report.fullMonthTracked && (
          <Card>
            <p className="text-sm text-text-secondary">
              {!report.trackingStartedAt
                ? "O registro de uso começa a contar a partir de agora. Por enquanto, as sugestões vêm só do raio-x dos registros."
                : report.hasTracking
                  ? `O registro de uso começou em ${formatDateBR(report.trackingStartedAt)}, então este mês ainda está incompleto: "não foi aberto" só aparece a partir de um mês com pelo menos duas semanas registradas.`
                  : `O registro de uso começou em ${formatDateBR(report.trackingStartedAt)}. Este mês só tem o raio-x dos registros.`}
            </p>
          </Card>
        )}

        {report.hasTracking && (
          <div className={report.fullMonthTracked ? "grid grid-cols-3 gap-3" : "grid grid-cols-2 gap-3"}>
            <StatCard label="Visitas" value={report.totalViews} />
            <StatCard label="Ações salvas" value={report.totalActions} />
            {/* Num mês com pouco registro, "sem uso" contaria o que só não deu tempo de abrir. */}
            {report.fullMonthTracked && (
              <StatCard label="Módulos sem uso" value={untouched.length} />
            )}
          </div>
        )}

        <UsageSuggestionsCard suggestions={report.suggestions} hrefFor={hrefFor} />

        {report.hasTracking && <UsageModulesCard modules={report.modules} />}

        <RaioXCard months={report.raioX.months} rows={report.raioX.rows} />

        {report.trackingStartedAt && report.fullMonthTracked && (
          <p className="text-xs text-text-secondary">
            Registro de uso ligado desde {formatDateBR(report.trackingStartedAt)}. Guarda só
            qual tela foi aberta e o que foi salvo, nunca o conteúdo.
          </p>
        )}
      </main>
    </>
  );
}
