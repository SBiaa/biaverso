import { prisma } from "@/lib/prisma";
import { bottomNavItems } from "@/components/layout/nav-config";
import {
  MORE_SCREEN,
  moduleForApi,
  moduleForScreen,
  recordsUnionSql,
  usageModules,
} from "@/lib/uso-modulos";

/**
 * A página "Uso do app" (/uso): o que ela usa no biaVerso, o que está parado e o
 * que dá trabalho demais para alcançar.
 *
 * Duas fontes:
 * - o raio-x, que conta registros criados por módulo e mês. Vem das tabelas
 *   que já existiam, então funciona para os meses antes do registro de uso;
 * - o registro de uso (`UsageEvent`), com visitas, ações e o caminho até cada
 *   tela. Só existe a partir do dia em que foi ligado.
 */

// Os números que decidem quando algo vira sugestão. Pequenos de propósito:
// é uma pessoa só usando, não milhares.
const MIN_VIEWS_FOR_SHORTCUT = 8;
const MIN_SHARE_VIA_MORE = 0.5;
const MIN_SESSIONS_FOR_STEPS = 5;
const MANY_STEPS = 2.5;
const MIN_SEARCH_ARRIVALS = 5;
const MIN_SHARE_VIA_SEARCH = 0.4;
const MIN_VIEWS_LOOK_ONLY = 6;
const MIN_MOBILE_VIEWS_TO_JUDGE_BAR = 30;
const MAX_VIEWS_UNDERUSED_BAR = 3;
const RAIO_X_MONTHS = 6;
/** Menos que isso de registro no mês e "não abriu" ainda não quer dizer nada. */
const MIN_TRACKED_DAYS = 14;

export type ModuleUsage = {
  key: string;
  label: string;
  href: string;
  views: number;
  mobileViews: number;
  desktopViews: number;
  actions: number;
  records: number;
  /** Chegadas pela tela "Mais" do celular. */
  viaMore: number;
  viaSearch: number;
  /** Média de telas abertas antes de chegar aqui pela primeira vez na sessão. */
  avgSteps: number | null;
  sessionsReached: number;
  inBottomBar: boolean;
};

export type Suggestion = {
  kind: "parado" | "atalho" | "caminho" | "busca" | "barra" | "so-olha";
  moduleKey: string;
  text: string;
};

export type RaioXRow = {
  key: string;
  label: string;
  href: string;
  /** Registros por mês, do mais antigo para o atual. */
  counts: number[];
  lastAt: Date | null;
};

type MonthKey = { month: number; year: number };

function monthStart({ month, year }: MonthKey) {
  return new Date(Date.UTC(year, month - 1, 1));
}

function shiftMonth({ month, year }: MonthKey, delta: number): MonthKey {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

const bottomBarHrefs = new Set(bottomNavItems.map((item) => item.href));

/**
 * Raio-x: registros criados por módulo nos `RAIO_X_MONTHS` meses que terminam
 * em `month`, e a data do registro mais recente de cada um (de qualquer época).
 */
export async function getRaioX(month: number, year: number) {
  const months = Array.from({ length: RAIO_X_MONTHS }, (_, i) =>
    shiftMonth({ month, year }, i - (RAIO_X_MONTHS - 1)),
  );
  const end = monthStart(shiftMonth({ month, year }, 1));

  // SQL montado só com constantes de `uso-modulos.ts`; a data vai como parâmetro.
  const rows = await prisma.$queryRawUnsafe<
    { module: string; month: Date | null; n: number; last: Date | null }[]
  >(
    `WITH r AS (${recordsUnionSql()})
     SELECT module, date_trunc('month', at) AS month, count(*)::int AS n, max(at) AS last
     FROM r WHERE at IS NOT NULL AND at < $1
     GROUP BY 1, 2`,
    end,
  );

  const result: RaioXRow[] = usageModules
    .filter((mod) => mod.records.length > 0)
    .map((mod) => {
      const mine = rows.filter((row) => row.module === mod.key);
      const counts = months.map(
        (m) =>
          mine.find(
            (row) =>
              row.month &&
              row.month.getUTCFullYear() === m.year &&
              row.month.getUTCMonth() + 1 === m.month,
          )?.n ?? 0,
      );
      const lastAt = mine.reduce<Date | null>(
        (latest, row) => (row.last && (!latest || row.last > latest) ? row.last : latest),
        null,
      );
      return { key: mod.key, label: mod.label, href: mod.href, counts, lastAt };
    });

  return { months, rows: result };
}

/** Visitas, ações e caminhos do mês, por módulo, e as sugestões que saem deles. */
export async function getUsageReport(month: number, year: number) {
  const start = monthStart({ month, year });
  const end = monthStart(shiftMonth({ month, year }, 1));

  const [events, firstEvent, raioX] = await Promise.all([
    prisma.usageEvent.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
      select: { kind: true, path: true, device: true, source: true, sessionId: true },
    }),
    prisma.usageEvent.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    getRaioX(month, year),
  ]);

  const usage = new Map<string, ModuleUsage>(
    usageModules.map((mod) => [
      mod.key,
      {
        key: mod.key,
        label: mod.label,
        href: mod.href,
        views: 0,
        mobileViews: 0,
        desktopViews: 0,
        actions: 0,
        records: raioX.rows.find((row) => row.key === mod.key)?.counts.at(-1) ?? 0,
        viaMore: 0,
        viaSearch: 0,
        avgSteps: null,
        sessionsReached: 0,
        inBottomBar: bottomBarHrefs.has(mod.href),
      },
    ]),
  );

  // Visitas agrupadas por sessão, na ordem em que aconteceram.
  const sessions = new Map<string, { path: string }[]>();
  let mobileViewsTotal = 0;

  for (const event of events) {
    if (event.kind === "action") {
      const mod = moduleForApi(event.path);
      if (mod) usage.get(mod.key)!.actions++;
      continue;
    }

    if (event.device === "mobile") mobileViewsTotal++;
    if (event.sessionId) {
      const list = sessions.get(event.sessionId) ?? [];
      const previous = list.at(-1);
      list.push({ path: event.path });
      sessions.set(event.sessionId, list);

      const mod = moduleForScreen(event.path);
      if (mod && previous?.path === MORE_SCREEN) usage.get(mod.key)!.viaMore++;
    }

    const mod = moduleForScreen(event.path);
    if (!mod) continue;
    const entry = usage.get(mod.key)!;
    entry.views++;
    if (event.device === "mobile") entry.mobileViews++;
    else entry.desktopViews++;
    if (event.source === "busca") entry.viaSearch++;
  }

  // Passos até cada módulo: quantas telas ela abriu na sessão antes de chegar
  // nele pela primeira vez. Abrir direto conta 0.
  const steps = new Map<string, number[]>();
  for (const list of sessions.values()) {
    const seen = new Set<string>();
    list.forEach((view, index) => {
      const mod = moduleForScreen(view.path);
      if (!mod || seen.has(mod.key)) return;
      seen.add(mod.key);
      steps.set(mod.key, [...(steps.get(mod.key) ?? []), index]);
    });
  }
  for (const [key, list] of steps) {
    const entry = usage.get(key)!;
    entry.sessionsReached = list.length;
    entry.avgSteps = list.reduce((sum, n) => sum + n, 0) / list.length;
  }

  const modules = [...usage.values()];
  const trackingStartedAt = firstEvent?.createdAt ?? null;
  const hasTracking = events.length > 0;
  // O mês só pode dizer "não foi aberto" se o registro cobriu boa parte dele.
  // No mês em que o registro foi ligado, o "parado" vem só do raio-x.
  const trackedFrom =
    trackingStartedAt && trackingStartedAt > start ? trackingStartedAt : start;
  const trackedDays = trackingStartedAt
    ? (end.getTime() - trackedFrom.getTime()) / 86_400_000
    : 0;
  const fullMonthTracked = hasTracking && trackedDays >= MIN_TRACKED_DAYS;

  return {
    modules,
    raioX,
    trackingStartedAt,
    hasTracking,
    fullMonthTracked,
    totalViews: events.filter((e) => e.kind === "view").length,
    totalActions: events.filter((e) => e.kind === "action").length,
    suggestions: buildSuggestions(modules, raioX.rows, { hasTracking, fullMonthTracked, mobileViewsTotal }),
  };
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function buildSuggestions(
  modules: ModuleUsage[],
  raioX: RaioXRow[],
  {
    hasTracking,
    fullMonthTracked,
    mobileViewsTotal,
  }: { hasTracking: boolean; fullMonthTracked: boolean; mobileViewsTotal: number },
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const isHub = (key: string) => key === "home";

  for (const mod of modules) {
    if (isHub(mod.key)) continue;
    const history = raioX.find((row) => row.key === mod.key);

    // Parado: nada aberto, nada salvo, nada registrado no mês.
    const untouched = mod.views === 0 && mod.actions === 0 && mod.records === 0;
    if (untouched && (fullMonthTracked || history)) {
      const quietMonths = history ? trailingZeros(history.counts) : 0;
      const text = fullMonthTracked
        ? quietMonths > 1
          ? `${mod.label} não foi aberto este mês e não tem registro novo há ${quietMonths} meses. Vale tirar do menu ou repensar para que ele serve?`
          : `${mod.label} não foi aberto este mês. Vale tirar do menu ou repensar para que ele serve?`
        : quietMonths > 1
          ? `${mod.label} está há ${quietMonths} meses seguidos sem nenhum registro novo.`
          : `${mod.label} não teve nenhum registro novo este mês.`;
      suggestions.push({ kind: "parado", moduleKey: mod.key, text });
      continue;
    }

    if (!hasTracking) continue;

    // Atalho: muito aberto no celular, quase sempre passando pelo "Mais".
    if (
      !mod.inBottomBar &&
      mod.mobileViews >= MIN_VIEWS_FOR_SHORTCUT &&
      mod.viaMore / mod.mobileViews >= MIN_SHARE_VIA_MORE
    ) {
      const weakest = modules
        .filter((m) => m.inBottomBar && !isHub(m.key) && m.mobileViews < mod.mobileViews)
        .sort((a, b) => a.mobileViews - b.mobileViews)[0];
      suggestions.push({
        kind: "atalho",
        moduleKey: mod.key,
        text: weakest
          ? `No celular você abriu ${mod.label} ${plural(mod.mobileViews, "vez", "vezes")}, ${mod.viaMore} delas passando por Mais. Que tal trocar ${weakest.label} (${plural(weakest.mobileViews, "visita", "visitas")}) por ${mod.label} na barra de baixo?`
          : `No celular você abriu ${mod.label} ${plural(mod.mobileViews, "vez", "vezes")}, ${mod.viaMore} delas passando por Mais. Vale um atalho na barra de baixo ou na Home.`,
      });
    }

    // Caminho longo: em média várias telas até chegar.
    if (
      mod.avgSteps !== null &&
      mod.sessionsReached >= MIN_SESSIONS_FOR_STEPS &&
      mod.avgSteps >= MANY_STEPS
    ) {
      suggestions.push({
        kind: "caminho",
        moduleKey: mod.key,
        text: `Até chegar em ${mod.label} você passa, em média, por ${mod.avgSteps.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} telas antes. Um atalho na Home encurtaria esse caminho.`,
      });
    }

    // Busca: ela acha pelo Ctrl+K, não pelo menu.
    if (
      mod.viaSearch >= MIN_SEARCH_ARRIVALS &&
      mod.viaSearch / Math.max(mod.views, 1) >= MIN_SHARE_VIA_SEARCH
    ) {
      suggestions.push({
        kind: "busca",
        moduleKey: mod.key,
        text: `Você chegou em ${mod.label} pela busca ${plural(mod.viaSearch, "vez", "vezes")}. Talvez o lugar dele no menu não esteja óbvio.`,
      });
    }

    // Só olha: abre bastante, nunca salva nada.
    const hasRecordSources = usageModules.find((m) => m.key === mod.key)!.records.length > 0;
    if (
      hasRecordSources &&
      mod.views >= MIN_VIEWS_LOOK_ONLY &&
      mod.actions === 0 &&
      mod.records === 0
    ) {
      suggestions.push({
        kind: "so-olha",
        moduleKey: mod.key,
        text: `Você abriu ${mod.label} ${plural(mod.views, "vez", "vezes")}, mas não registrou nada. Se é só consulta, tudo certo. Se era para preencher, alguma coisa pode estar difícil.`,
      });
    }
  }

  // Barra do celular: lugar fixo para algo que quase não se abre por ela.
  if (hasTracking && mobileViewsTotal >= MIN_MOBILE_VIEWS_TO_JUDGE_BAR) {
    for (const mod of modules) {
      if (!mod.inBottomBar || isHub(mod.key)) continue;
      if (mod.mobileViews <= MAX_VIEWS_UNDERUSED_BAR) {
        suggestions.push({
          kind: "barra",
          moduleKey: mod.key,
          text: `${mod.label} ocupa um lugar na barra de baixo, mas foi aberto só ${plural(mod.mobileViews, "vez", "vezes")} pelo celular este mês.`,
        });
      }
    }
  }

  // Primeiro o que pede ação de navegação, depois o que está parado.
  const order: Suggestion["kind"][] = ["atalho", "caminho", "barra", "busca", "so-olha", "parado"];
  return suggestions.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

/** Quantos meses seguidos, contando do último, ficaram em zero. */
function trailingZeros(counts: number[]) {
  let n = 0;
  for (let i = counts.length - 1; i >= 0 && counts[i] === 0; i--) n++;
  return n;
}
