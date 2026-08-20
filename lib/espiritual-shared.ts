/**
 * A Roda do Ano, as luas e os rótulos do módulo espiritual.
 *
 * Client-safe: nada de Prisma aqui. Quem precisa do banco importa
 * "@/lib/espiritual", que reexporta tudo isto.
 *
 * As datas são do **hemisfério sul**. Não é detalhe: no norte, Samhain é 31 de
 * outubro; aqui é 30 de abril, porque o sabbath acompanha a estação, e a
 * estação é invertida. Seguir a tabela dos livros no Brasil seria celebrar a
 * entrada do inverno em pleno começo do verão.
 */

import {
  calendarDayOf,
  moonPhaseAt,
  nextMoonEvent,
  solarEvent,
  type MoonEvent,
  type MoonEventKind,
  type MoonPhase,
  type SolarEvent,
} from "@/lib/astros";

// ------------------------------------------------------------ roda do ano

export type SabbatKey =
  | "LUGHNASADH"
  | "MABON"
  | "SAMHAIN"
  | "YULE"
  | "IMBOLC"
  | "OSTARA"
  | "BELTANE"
  | "LITHA";

/**
 * Como a data do sabbath é decidida.
 *
 * Os quatro solares (`SOLAR`) são o solstício ou equinócio em si, e por isso
 * andam de ano para ano. Os quatro do fogo (`FOGO`) caem em data fixa, no meio
 * do caminho entre dois solares.
 */
type SabbatDefinition = {
  key: SabbatKey;
  name: string;
  /** O outro nome pelo qual ela pode ouvir falar dele. */
  alsoKnownAs: string | null;
  kind: "SOLAR" | "FOGO";
  /** O que o dia marca no céu e na terra. */
  season: string;
  /** O que se costuma fazer nele. */
  work: string;
  /** Solares: qual evento. Fogo: [mês (1-12), dia]. */
  anchor: SolarEvent | [number, number];
  /**
   * Para os do fogo, que são celebrados na virada da noite — a data que consta
   * é a do começo, e a festa atravessa para o dia seguinte.
   */
  nightInto: string | null;
};

const WHEEL: readonly SabbatDefinition[] = [
  {
    key: "LUGHNASADH",
    name: "Lughnasadh",
    alsoKnownAs: "Lammas",
    kind: "FOGO",
    season: "Primeira colheita — o que foi plantado começa a dar",
    work: "Pão, gratidão pelo que já veio, balanço do que ainda amadurece",
    anchor: [2, 1],
    nightInto: "2 de fevereiro",
  },
  {
    key: "MABON",
    name: "Mabon",
    alsoKnownAs: "Equinócio de outono",
    kind: "SOLAR",
    season: "Dia e noite do mesmo tamanho, entrando no escuro",
    work: "Segunda colheita, equilíbrio, agradecer e soltar o que pesa",
    anchor: "MARCO",
    nightInto: null,
  },
  {
    key: "SAMHAIN",
    name: "Samhain",
    alsoKnownAs: "Ano-novo das bruxas",
    kind: "FOGO",
    season: "O véu fino — a noite mais importante da roda",
    work: "Ancestrais, adivinhação, encerrar ciclo e olhar o que morreu no ano",
    anchor: [4, 30],
    nightInto: "1º de maio",
  },
  {
    key: "YULE",
    name: "Yule",
    alsoKnownAs: "Solstício de inverno",
    kind: "SOLAR",
    season: "A noite mais longa do ano — e o sol renascendo dela",
    work: "Silêncio, sonhos, intenções guardadas para brotar depois",
    anchor: "JUNHO",
    nightInto: null,
  },
  {
    key: "IMBOLC",
    name: "Imbolc",
    alsoKnownAs: "Candlemas",
    kind: "FOGO",
    season: "Primeiros brotos sob a terra, ainda no frio",
    work: "Purificação da casa, velas, Brigid, iniciações e recomeços",
    anchor: [8, 1],
    nightInto: "2 de agosto",
  },
  {
    key: "OSTARA",
    name: "Ostara",
    alsoKnownAs: "Equinócio de primavera",
    kind: "SOLAR",
    season: "Dia e noite iguais, indo para a luz",
    work: "Plantio, fertilidade, começar de fato o que foi sonhado no Yule",
    anchor: "SETEMBRO",
    nightInto: null,
  },
  {
    key: "BELTANE",
    name: "Beltane",
    alsoKnownAs: "Walpurgis",
    kind: "FOGO",
    season: "O véu fino de novo, agora do lado da vida",
    work: "Fogo, união, desejo, tudo que é força vital e prazer",
    anchor: [10, 31],
    nightInto: "1º de novembro",
  },
  {
    key: "LITHA",
    name: "Litha",
    alsoKnownAs: "Solstício de verão",
    kind: "SOLAR",
    season: "O dia mais longo — o sol no auge, e começando a ceder",
    work: "Colher ervas, força, proteção, celebrar o que está no ápice",
    anchor: "DEZEMBRO",
    nightInto: null,
  },
];

export type Sabbat = Omit<SabbatDefinition, "anchor"> & {
  /** Dia de calendário, meia-noite UTC — a régua de comparação do app. */
  date: Date;
  /** Instante exato, só nos solares. Nos do fogo a data é convenção, não céu. */
  at: Date | null;
};

function resolve(definition: SabbatDefinition, year: number): Sabbat {
  const { anchor, ...rest } = definition;

  if (typeof anchor === "string") {
    const at = solarEvent(anchor, year);
    return { ...rest, at, date: calendarDayOf(at) };
  }

  const [month, day] = anchor;
  return { ...rest, at: null, date: new Date(Date.UTC(year, month - 1, day)) };
}

/** Os oito sabbats de um ano, em ordem de data. */
export function wheelOfYear(year: number): Sabbat[] {
  return WHEEL.map((s) => resolve(s, year)).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
}

/**
 * Uma volta inteira da roda a partir de hoje.
 *
 * Vale mais que o ano-calendário: em novembro, a roda de 2026 já acabou e a
 * tela mostraria oito datas passadas. Aqui o primeiro item é sempre o próximo.
 */
export function wheelAhead(today: Date, count = 8): Sabbat[] {
  const year = today.getUTCFullYear();
  return [...wheelOfYear(year), ...wheelOfYear(year + 1)]
    .filter((s) => s.date >= today)
    .slice(0, count);
}

/** O sabbath mais próximo daqui para a frente, e a quantos dias ele está. */
export function nextSabbat(today: Date): { sabbat: Sabbat; daysAway: number } {
  const sabbat = wheelAhead(today, 1)[0];
  const daysAway = Math.round(
    (sabbat.date.getTime() - today.getTime()) / 86_400_000,
  );
  return { sabbat, daysAway };
}

/**
 * A ordem do ciclo, e não a do calendário.
 *
 * Começa em Samhain porque é ali que o ano das bruxas vira. É esta ordem que o
 * desenho da roda usa: de Samhain, no topo, dando a volta.
 */
export const wheelOrder: readonly SabbatKey[] = [
  "SAMHAIN",
  "YULE",
  "IMBOLC",
  "OSTARA",
  "BELTANE",
  "LITHA",
  "LUGHNASADH",
  "MABON",
];

/**
 * Onde hoje cai na roda: entre qual sabbath e qual, e quanto já andou do
 * caminho entre os dois (0 a 1).
 *
 * É o que permite desenhar o ponteiro do "hoje" no lugar certo, em vez de
 * apenas acender o próximo sabbath.
 */
export function wheelPosition(today: Date) {
  const year = today.getUTCFullYear();
  const all = [
    ...wheelOfYear(year - 1),
    ...wheelOfYear(year),
    ...wheelOfYear(year + 1),
  ];

  const index = all.findIndex((s) => s.date >= today);
  const next = all[index];
  const previous = all[index - 1];
  const span = next.date.getTime() - previous.date.getTime();

  return {
    previous,
    next,
    fraction: (today.getTime() - previous.date.getTime()) / span,
  };
}

// ------------------------------------------------------------------ luas

export const moonPhaseLabels: Record<MoonPhase, string> = {
  NOVA: "Lua nova",
  CRESCENTE: "Crescente",
  QUARTO_CRESCENTE: "Quarto crescente",
  GIBOSA_CRESCENTE: "Gibosa crescente",
  CHEIA: "Lua cheia",
  GIBOSA_MINGUANTE: "Gibosa minguante",
  QUARTO_MINGUANTE: "Quarto minguante",
  BALSAMICA: "Balsâmica",
};

/** O que cada fase costuma pedir — a régua clássica, em uma linha. */
export const moonPhaseWork: Record<MoonPhase, string> = {
  NOVA: "Semear intenção, começar do zero, plantar no escuro",
  CRESCENTE: "Dar corpo ao que foi pedido, primeiros passos",
  QUARTO_CRESCENTE: "Decidir e agir, empurrar contra a resistência",
  GIBOSA_CRESCENTE: "Ajustar, refinar, cuidar do que está quase pronto",
  CHEIA: "Auge — carregar objetos, agradecer, celebrar, adivinhar",
  GIBOSA_MINGUANTE: "Compartilhar, ensinar, colher o que deu certo",
  QUARTO_MINGUANTE: "Cortar, desfazer laço, soltar o que não serve",
  BALSAMICA: "Descanso, limpeza, silêncio antes de recomeçar",
};

/**
 * O desenho da lua — espelhado para o hemisfério sul.
 *
 * Daqui a lua cresce pelo lado esquerdo, ao contrário do que se vê no norte.
 * Por isso a crescente usa o símbolo que o norte reserva para a minguante, e
 * vice-versa: o que está na tela é o que ela vê quando olha para o céu.
 *
 * Símbolo geométrico (● ○ ◗) não serve aqui: quem lê "cheia" espera um disco
 * claro, e num tema escuro o círculo preenchido acende justamente na lua nova.
 */
export const moonPhaseGlyph: Record<MoonPhase, string> = {
  NOVA: "🌑",
  CRESCENTE: "🌘",
  QUARTO_CRESCENTE: "🌗",
  GIBOSA_CRESCENTE: "🌖",
  CHEIA: "🌕",
  GIBOSA_MINGUANTE: "🌔",
  QUARTO_MINGUANTE: "🌓",
  BALSAMICA: "🌒",
};

export const moonEventLabels: Record<MoonEventKind, string> = {
  NOVA: "Lua nova",
  CHEIA: "Lua cheia",
};

/**
 * A fase da lua num dia de calendário.
 *
 * O meio-dia local (15h UTC) e não a meia-noite: a fase muda ao longo do dia, e
 * medir no meio dá a resposta que vale para o dia inteiro.
 */
export function moonPhaseOfDay(day: Date) {
  return moonPhaseAt(new Date(day.getTime() + 15 * 3_600_000));
}

/**
 * A próxima lua nova ou cheia, contando o dia de hoje como ainda por vir.
 *
 * A comparação é por dia de calendário, e não por instante: uma lua cheia que
 * aconteceu hoje à 1h da manhã ainda é "a lua cheia de hoje" para quem vai
 * fazer o esbat à noite — dizer que a próxima é daqui a um mês seria mentira.
 */
export function nextMoonEventOnOrAfter(kind: MoonEventKind, day: Date): MoonEvent {
  let event = nextMoonEvent(kind, new Date(day.getTime() - 3 * 86_400_000));
  while (event.date < day) event = nextMoonEvent(kind, event.at);
  return event;
}

// ----------------------------------------------------------------- vistas
//
// O que as telas recebem. Ficam aqui, e não em "@/lib/espiritual", porque os
// componentes de cliente precisam destes tipos e aquele arquivo importa Prisma.
//
// Toda data é "YYYY-MM-DD": é o formato do <input type="date"> e o único que
// atravessa a fronteira servidor/cliente sem chance de voltar um dia.

export type MeetingView = {
  id: string;
  title: string;
  kind: string;
  date: string;
  time: string | null;
  endTime: string | null;
  place: string | null;
  agenda: string | null;
  notes: string | null;
  /** Nulo enquanto o encontro não chegou; depois, se ela foi ou não. */
  attended: boolean | null;
  /** Se o compromisso espelho existe na Agenda (e portanto no Google). */
  onAgenda: boolean;
  studies: { id: string; title: string; status: string; dueDate: string | null }[];
};

export type MeetingOption = {
  id: string;
  title: string;
  kind: string;
  date: string;
};

export type StudyView = {
  id: string;
  title: string;
  kind: string;
  status: string;
  receivedAt: string | null;
  dueDate: string | null;
  deliveredAt: string | null;
  content: string | null;
  notes: string | null;
  link: string | null;
  meetingId: string | null;
  meetingTitle: string | null;
};

export type RitualView = {
  id: string;
  title: string;
  date: string;
  kind: string;
  intention: string | null;
  elements: string | null;
  notes: string | null;
  outcome: string | null;
};

export type DivinationView = {
  id: string;
  date: string;
  method: string;
  deck: string | null;
  question: string | null;
  spread: string | null;
  cards: string[];
  reading: string | null;
  outcome: string | null;
};

export type AltarItemView = {
  id: string;
  name: string;
  category: string;
  quantity: string | null;
  runningLow: boolean;
  properties: string | null;
  notes: string | null;
};

// --------------------------------------------------------------- rótulos

export const covenMeetingKindLabels: Record<string, string> = {
  COVEN: "Encontro do coven",
  MESTRE: "A sós com a mestre",
  RITUAL_COLETIVO: "Ritual coletivo",
  AULA: "Aula",
  OUTRO: "Outro",
};

export const studyKindLabels: Record<string, string> = {
  TEXTO: "Texto",
  EXERCICIO: "Exercício",
  LEITURA: "Leitura",
  PRATICA: "Prática",
  PESQUISA: "Pesquisa",
  OUTRO: "Outro",
};

export const studyStatusLabels: Record<string, string> = {
  A_FAZER: "A fazer",
  EM_ANDAMENTO: "Em andamento",
  FEITO: "Feito",
  ENTREGUE: "Entregue",
};

export const ritualKindLabels: Record<string, string> = {
  RITUAL: "Ritual",
  FEITICO: "Feitiço",
  MEDITACAO: "Meditação",
  OFERENDA: "Oferenda",
  BANHO: "Banho",
  SABBAT: "Sabbath",
  ESBAT: "Esbat",
  OUTRO: "Outro",
};

export const divinationMethodLabels: Record<string, string> = {
  TAROT: "Tarô",
  ORACULO: "Oráculo",
  RUNAS: "Runas",
  PENDULO: "Pêndulo",
  BUZIOS: "Búzios",
  OUTRO: "Outro",
};

export const altarCategoryLabels: Record<string, string> = {
  ERVA: "Erva",
  CRISTAL: "Cristal",
  VELA: "Vela",
  INCENSO: "Incenso",
  OLEO: "Óleo",
  FERRAMENTA: "Ferramenta",
  BARALHO: "Baralho",
  IMAGEM: "Imagem",
  OUTRO: "Outro",
};

/** Um estudo só sai da frente quando foi entregue — feito ainda espera entrega. */
export const OPEN_STUDY_STATUS = ["A_FAZER", "EM_ANDAMENTO", "FEITO"] as const;
