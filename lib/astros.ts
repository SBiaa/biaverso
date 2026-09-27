/**
 * O céu, calculado — sem tabela fixa e sem internet.
 *
 * Duas coisas moram aqui: as datas dos solstícios e equinócios (que ancoram
 * metade da Roda do Ano) e as fases da lua. Ambas são contas puras, então este
 * arquivo é seguro no cliente: nada de Prisma, nada de rede.
 *
 * Por que calcular em vez de cravar "21 de junho"? Porque o solstício anda: em
 * 2024 caiu dia 20, em 2027 cai dia 21. Uma tabela chumbada envelhece calada e
 * um dia mostra o sabbath no dia errado. As fórmulas são as do Meeus
 * (Astronomical Algorithms, cap. 27 e 49), com erro abaixo de um minuto — de
 * sobra para acertar o dia.
 *
 * Ressalva honesta: o Meeus devolve Tempo Dinâmico, hoje ~70 segundos à frente
 * do UTC. Só importaria para um evento que caísse a menos de um minuto da
 * meia-noite; nesse caso o dia poderia sair trocado.
 */

import { APP_TIME_ZONE, parseDateOnly } from "@/lib/utils";

const RAD = Math.PI / 180;
const sin = (degrees: number) => Math.sin(degrees * RAD);
const cos = (degrees: number) => Math.cos(degrees * RAD);

/** Dia juliano → instante real. 2440587.5 é o JD de 1970-01-01T00:00Z. */
function fromJulianDay(jd: number): Date {
  return new Date((jd - 2440587.5) * 86_400_000);
}

function toJulianDay(date: Date): number {
  return date.getTime() / 86_400_000 + 2440587.5;
}

/**
 * O dia de calendário (meia-noite UTC) em que um instante cai no fuso do app.
 *
 * Sem esta conversão, um evento às 02h UTC — que aqui ainda é a véspera —
 * apareceria um dia à frente na tela.
 */
export function calendarDayOf(instant: Date): Date {
  return parseDateOnly(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(instant),
  )!;
}

/** Hora local do instante, no formato "17h50". */
export function formatTimeBR(instant: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(instant)
    .replace(":", "h");
}

// ------------------------------------------------- solstícios e equinócios

export type SolarEvent = "MARCO" | "JUNHO" | "SETEMBRO" | "DEZEMBRO";

/** Meeus, tabela 27.B — o instante médio, antes das correções periódicas. */
const MEAN_TERMS: Record<SolarEvent, readonly number[]> = {
  MARCO: [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
  JUNHO: [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.0003],
  SETEMBRO: [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
  DEZEMBRO: [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032],
};

/** Meeus, tabela 27.C — as 24 perturbações planetárias. */
const PERIODIC: readonly (readonly [number, number, number])[] = [
  [485, 324.96, 1934.136],
  [203, 337.23, 32964.467],
  [199, 342.08, 20.186],
  [182, 27.85, 445267.112],
  [156, 73.14, 45036.886],
  [136, 171.52, 22518.443],
  [77, 222.54, 65928.934],
  [74, 296.72, 3034.906],
  [70, 243.58, 9037.513],
  [58, 119.81, 33718.147],
  [52, 297.17, 150.678],
  [50, 21.02, 2281.226],
  [45, 247.54, 29929.562],
  [44, 325.15, 31555.956],
  [29, 60.93, 4443.417],
  [18, 155.12, 67555.328],
  [17, 288.79, 4562.452],
  [16, 198.04, 62894.029],
  [14, 199.76, 31436.921],
  [12, 95.39, 14577.848],
  [12, 287.11, 31931.756],
  [12, 320.81, 34777.259],
  [9, 227.73, 1222.114],
  [8, 15.45, 16859.074],
];

/** O instante exato do solstício ou equinócio pedido, naquele ano. */
export function solarEvent(event: SolarEvent, year: number): Date {
  const y = (year - 2000) / 1000;
  const [a, b, c, d, e] = MEAN_TERMS[event];
  const jde0 = a + b * y + c * y * y + d * y ** 3 + e * y ** 4;

  const t = (jde0 - 2451545.0) / 36525;
  const w = 35999.373 * t - 2.47;
  const lambda = 1 + 0.0334 * cos(w) + 0.0007 * cos(2 * w);
  const s = PERIODIC.reduce(
    (total, [amp, phase, freq]) => total + amp * cos(phase + freq * t),
    0,
  );

  return fromJulianDay(jde0 + (0.00001 * s) / lambda);
}

// ------------------------------------------------------------ fases da lua

/** Duração média da lunação — a régua para idade e iluminação da lua. */
export const SYNODIC_MONTH = 29.530588861;

/**
 * Correções da lua nova e da lua cheia (Meeus, cap. 49).
 *
 * As duas tabelas são quase a mesma coisa: só os sete primeiros coeficientes
 * mudam, e daí para baixo os termos são idênticos — por isso a cauda é
 * compartilhada. Cada linha é [amplitude, potência de E, índice do argumento];
 * os argumentos são montados uma vez só, na ordem desses índices.
 */
type Term = readonly [number, number, number];

const COMMON_TAIL: readonly Term[] = [
  [-0.00111, 0, 4],
  [-0.00057, 0, 5],
  [0.00056, 1, 6],
  [-0.00042, 0, 7],
  [0.00042, 1, 8],
  [0.00038, 1, 9],
  [-0.00024, 1, 10],
  [-0.00017, 0, 11],
  [-0.00007, 0, 12],
  [0.00004, 0, 13],
  [0.00004, 0, 14],
  [0.00003, 0, 15],
  [0.00003, 0, 16],
  [-0.00003, 0, 17],
  [0.00003, 0, 18],
  [-0.00002, 0, 19],
  [-0.00002, 0, 20],
  [0.00002, 0, 21],
];

const NEW_MOON_TERMS: readonly Term[] = [
  [-0.4072, 0, 1],
  [0.17241, 1, 0],
  [0.01608, 0, 2],
  [0.01039, 0, 3],
  [0.00739, 1, 22],
  [-0.00514, 1, 23],
  [0.00208, 2, 24],
  ...COMMON_TAIL,
];

const FULL_MOON_TERMS: readonly Term[] = [
  [-0.40614, 0, 1],
  [0.17302, 1, 0],
  [0.01614, 0, 2],
  [0.01043, 0, 3],
  [0.00734, 1, 22],
  [-0.00515, 1, 23],
  [0.00209, 2, 24],
  ...COMMON_TAIL,
];

/**
 * O instante da lua nova (`quarter` 0) ou cheia (`quarter` 0.5) da lunação `k`.
 *
 * `k` conta lunações desde a lua nova de 6 de janeiro de 2000: 0 é aquela, 1 a
 * seguinte, −1 a anterior.
 */
function moonPhaseInstant(k: number, quarter: 0 | 0.5): Date {
  const kk = k + quarter;
  const t = kk / 1236.85;

  const jde =
    2451550.09766 +
    29.530588861 * kk +
    0.00015437 * t ** 2 -
    0.00000015 * t ** 3 +
    0.00000000073 * t ** 4;

  // E corrige a excentricidade da órbita da Terra, que muda devagar com o
  // tempo; os termos que dependem do Sol são multiplicados por ela.
  const e = 1 - 0.002516 * t - 0.0000074 * t ** 2;

  // Anomalia média do Sol, anomalia média da Lua, argumento de latitude da Lua
  // e longitude do nodo ascendente.
  const M = 2.5534 + 29.1053567 * kk - 0.0000014 * t ** 2 - 0.00000011 * t ** 3;
  const Ml =
    201.5643 +
    385.81693528 * kk +
    0.0107582 * t ** 2 +
    0.00001238 * t ** 3 -
    0.000000058 * t ** 4;
  const F =
    160.7108 +
    390.67050284 * kk -
    0.0016118 * t ** 2 -
    0.00000227 * t ** 3 +
    0.000000011 * t ** 4;
  const omega =
    124.7746 - 1.56375588 * kk + 0.0020672 * t ** 2 + 0.00000215 * t ** 3;

  const args = [
    M,
    Ml,
    2 * Ml,
    2 * F,
    Ml - 2 * F,
    Ml + 2 * F,
    2 * Ml + M,
    3 * Ml,
    M + 2 * F,
    M - 2 * F,
    2 * Ml - M,
    omega,
    Ml + 2 * M,
    2 * Ml - 2 * F,
    3 * M,
    Ml + M - 2 * F,
    2 * Ml + 2 * F,
    Ml + M + 2 * F,
    Ml - M + 2 * F,
    Ml - M - 2 * F,
    3 * Ml + M,
    4 * Ml,
    Ml - M,
    Ml + M,
    2 * M,
  ];

  const terms = quarter === 0 ? NEW_MOON_TERMS : FULL_MOON_TERMS;
  const correction = terms.reduce(
    (total, [amp, power, index]) => total + amp * e ** power * sin(args[index]),
    0,
  );

  return fromJulianDay(jde + correction);
}

/** A lunação aproximada em curso numa data — ponto de partida das buscas. */
function lunationAt(date: Date): number {
  const year =
    date.getUTCFullYear() +
    (date.getUTCMonth() * 30.44 + date.getUTCDate()) / 365.25;
  return Math.floor((year - 2000) * 12.3685);
}

export type MoonEventKind = "NOVA" | "CHEIA";

export type MoonEvent = {
  kind: MoonEventKind;
  /** O instante exato, para mostrar a hora. */
  at: Date;
  /** O dia de calendário no fuso do app — é por ele que se compara e filtra. */
  date: Date;
};

/** Luas novas e cheias entre duas datas, em ordem. Fim exclusivo. */
export function moonEventsBetween(start: Date, end: Date): MoonEvent[] {
  const events: MoonEvent[] = [];
  // Duas lunações de folga dos dois lados: a busca é por instante, e um evento
  // logo fora do intervalo ainda pode cair dentro dele no fuso local.
  const from = lunationAt(start) - 2;
  const to = lunationAt(end) + 2;

  for (let k = from; k <= to; k++) {
    for (const quarter of [0, 0.5] as const) {
      const at = moonPhaseInstant(k, quarter);
      const date = calendarDayOf(at);
      if (date >= start && date < end) {
        events.push({ kind: quarter === 0 ? "NOVA" : "CHEIA", at, date });
      }
    }
  }

  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** A próxima lua nova ou cheia depois de um instante. */
export function nextMoonEvent(kind: MoonEventKind, from: Date): MoonEvent {
  const quarter = kind === "NOVA" ? 0 : 0.5;
  let k = lunationAt(from) - 2;
  for (;;) {
    const at = moonPhaseInstant(k, quarter);
    if (at.getTime() > from.getTime()) return { kind, at, date: calendarDayOf(at) };
    k++;
  }
}

export type MoonPhase =
  | "NOVA"
  | "CRESCENTE"
  | "QUARTO_CRESCENTE"
  | "GIBOSA_CRESCENTE"
  | "CHEIA"
  | "GIBOSA_MINGUANTE"
  | "QUARTO_MINGUANTE"
  | "BALSAMICA";

const PHASE_ORDER: MoonPhase[] = [
  "NOVA",
  "CRESCENTE",
  "QUARTO_CRESCENTE",
  "GIBOSA_CRESCENTE",
  "CHEIA",
  "GIBOSA_MINGUANTE",
  "QUARTO_MINGUANTE",
  "BALSAMICA",
];

export type MoonNow = {
  phase: MoonPhase;
  /** Dias desde a lua nova, de 0 a ~29,5. */
  age: number;
  /** Fração iluminada do disco, de 0 a 1. */
  illumination: number;
};

/**
 * A fase da lua num instante.
 *
 * A idade sai da distância até a última lua nova de verdade — não de uma média
 * a partir de uma data-âncora —, então não acumula erro com os anos. As oito
 * fatias são iguais: as quatro "principais" ocupam ±1,85 dia em volta do
 * momento exato, que é mais ou menos o quanto o olho ainda chama de lua cheia.
 */
export function moonPhaseAt(instant: Date): MoonNow {
  let k = lunationAt(instant) + 1;
  let lastNew = moonPhaseInstant(k, 0);
  while (lastNew.getTime() > instant.getTime()) {
    k--;
    lastNew = moonPhaseInstant(k, 0);
  }

  const age = toJulianDay(instant) - toJulianDay(lastNew);
  const fraction = age / SYNODIC_MONTH;
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;
  const slice = Math.floor(fraction * 8 + 0.5) % 8;

  return { phase: PHASE_ORDER[slice], age, illumination };
}
