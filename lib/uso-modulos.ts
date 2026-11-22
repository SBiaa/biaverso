/**
 * Os módulos do biaVerso do ponto de vista do registro de uso.
 *
 * Cada módulo junta três pistas de que está sendo usado:
 * - `screens`: as telas dele (visitas);
 * - `apis`: as rotas de API que ele chama (ações salvas);
 * - `records`: tabelas cujos registros contam como "ela fez algo aqui". É o
 *   que deixa o raio-x olhar para trás, para antes de existir o registro.
 *
 * Os `records` só listam o que ela cria de próprio punho. Ficam de fora as
 * tabelas que o app enche sozinho (dias, rotinas geradas, mensagens do
 * WhatsApp, eventos importados do Google, avaliações criadas ao abrir).
 *
 * O SQL dos `records` é constante daqui, nunca vem de fora.
 */

export type RecordSource = {
  /** Nome da tabela (igual ao model, o schema não usa @@map). */
  table: string;
  /** Coluna com a data do registro. Padrão: "createdAt". */
  at?: string;
  /** Data vem do dia ligado (`dayId` → Day.date), para logs sem createdAt. */
  viaDay?: boolean;
  /** Filtro extra, em SQL, sobre a tabela (alias `t`). */
  where?: string;
};

export type UsageModule = {
  key: string;
  label: string;
  href: string;
  screens: string[];
  apis: string[];
  records: RecordSource[];
};

export const usageModules: UsageModule[] = [
  { key: "home", label: "Home", href: "/", screens: ["/"], apis: [], records: [] },
  {
    key: "dia",
    label: "Dia a dia",
    href: "/dia",
    screens: ["/dia"],
    apis: ["tasks", "subtasks", "habits", "habit-logs", "water-logs", "day-focus", "dias", "work-task-order"],
    records: [
      { table: "Task", where: `t."type" = 'AVULSA'` },
      // Rotinas são geradas pelo app; o que conta é ela ter concluído.
      { table: "Task", at: "completedAt", where: `t."type" <> 'AVULSA' AND t."completedAt" IS NOT NULL` },
      { table: "HabitLog", viaDay: true, where: `t."done"` },
      { table: "WaterLog", at: "loggedAt" },
      { table: "DayFocus" },
    ],
  },
  { key: "agenda", label: "Agenda", href: "/agenda", screens: ["/agenda"], apis: ["events", "calendar"], records: [] },
  {
    key: "horas",
    label: "Controle de horas",
    href: "/horas",
    screens: ["/horas"],
    apis: ["time-entries", "time-blocks", "activity-categories", "pomodoro-settings", "time-options"],
    records: [{ table: "TimeEntry" }, { table: "TimeBlock" }],
  },
  { key: "radar", label: "Radar", href: "/radar", screens: ["/radar"], apis: [], records: [] },
  { key: "whatsapp", label: "WhatsApp", href: "/whatsapp", screens: ["/whatsapp"], apis: [], records: [] },
  {
    key: "negocios",
    label: "Negócios",
    href: "/negocios",
    screens: ["/negocios"],
    apis: ["businesses", "client-business", "collections", "orders", "priority-levels", "ace", "feed"],
    records: [
      { table: "ContentPost" },
      { table: "ProductionTask" },
      { table: "Order" },
      { table: "Collection" },
      { table: "CollectionTask" },
    ],
  },
  {
    key: "projetos",
    label: "Projetos",
    href: "/projetos",
    screens: ["/projetos"],
    apis: ["projects"],
    records: [{ table: "Project" }, { table: "ProjectLogEntry" }, { table: "ProjectDocument" }],
  },
  {
    key: "clientes",
    label: "Clientes",
    href: "/clientes",
    screens: ["/clientes"],
    apis: ["clients", "prospect-notes", "prospect-tasks"],
    records: [{ table: "Client" }, { table: "ProspectNote" }, { table: "ProspectTask" }],
  },
  {
    key: "produtos",
    label: "Produtos",
    href: "/produtos",
    screens: ["/produtos"],
    apis: ["products", "materials"],
    records: [{ table: "Product" }, { table: "Material" }],
  },
  {
    key: "visao",
    label: "Central de Visão",
    href: "/visao",
    screens: ["/visao"],
    apis: ["vision"],
    records: [
      { table: "Pillar" },
      { table: "Principle" },
      { table: "ConceptualGoal" },
      { table: "MeasuredGoal" },
      { table: "Desire" },
      { table: "MoodboardItem" },
      { table: "Goal" },
    ],
  },
  { key: "ano", label: "Planejamento do ano", href: "/ano", screens: ["/ano"], apis: ["year-plan"], records: [{ table: "YearPlan" }] },
  {
    key: "avaliacao",
    label: "Avaliação",
    href: "/avaliacao",
    screens: ["/avaliacao"],
    apis: ["week-reviews", "month-reviews", "quarter-reviews"],
    records: [{ table: "WeekReview" }],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    href: "/financeiro",
    screens: ["/financeiro"],
    apis: ["transactions", "fixed-bills", "fixed-bill-logs", "credit-card", "credit-card-entries", "credit-card-purchases", "financial-records", "financeiro"],
    records: [
      { table: "Transaction" },
      { table: "CreditCardPurchase" },
      { table: "FixedBillLog", at: "paidAt", where: `t."paidAt" IS NOT NULL` },
      { table: "FinancialRecord" },
    ],
  },
  { key: "desejos", label: "Lista de desejos", href: "/desejos", screens: ["/desejos"], apis: ["wishlist"], records: [{ table: "WishlistItem" }] },
  {
    key: "cardapio",
    label: "Cardápio",
    href: "/cardapio",
    screens: ["/cardapio"],
    apis: ["recipes", "ingredients", "meal-plans", "meal-logs"],
    records: [{ table: "Recipe" }, { table: "MealPlan" }, { table: "MealLog", viaDay: true }],
  },
  {
    key: "beleza",
    label: "Beleza",
    href: "/beleza",
    screens: ["/beleza"],
    apis: ["beauty"],
    records: [
      { table: "CareRoutineLog", at: "date", where: `t."done"` },
      { table: "CareScheduleLog" },
      { table: "CareAppointmentLog" },
      { table: "BeautyProduct" },
    ],
  },
  { key: "ciclo", label: "Ciclo", href: "/ciclo", screens: ["/ciclo"], apis: ["cycle-logs"], records: [{ table: "CycleLog" }] },
  {
    key: "espiritual",
    label: "Espiritual",
    href: "/espiritual",
    screens: ["/espiritual"],
    apis: ["coven-meetings", "spiritual-studies", "rituals", "divinations", "altar-items"],
    records: [
      { table: "CovenMeeting" },
      { table: "SpiritualStudy" },
      { table: "RitualLog" },
      { table: "Divination" },
      { table: "AltarItem" },
    ],
  },
  { key: "livros", label: "Livros", href: "/livros", screens: ["/livros"], apis: ["books"], records: [{ table: "Book" }] },
  {
    key: "conhecimento",
    label: "Conhecimento",
    href: "/conhecimento",
    screens: ["/conhecimento"],
    apis: ["knowledge", "study"],
    records: [
      { table: "Knowledge" },
      { table: "StudyLesson", at: "completedAt", where: `t."completedAt" IS NOT NULL` },
    ],
  },
  { key: "ideias", label: "Ideias", href: "/ideias", screens: ["/ideias"], apis: ["ideas"], records: [{ table: "Idea" }] },
  { key: "senhas", label: "Senhas", href: "/senhas", screens: ["/senhas"], apis: ["passwords"], records: [{ table: "PasswordEntry" }] },
  { key: "configuracoes", label: "Configurações", href: "/configuracoes", screens: ["/configuracoes"], apis: ["settings"], records: [] },
];

/** A tela "Mais" do celular: corredor para chegar em outras, não um módulo. */
export const MORE_SCREEN = "/mais";

/** Módulo de uma tela já normalizada ("/financeiro/transacoes" → financeiro). */
export function moduleForScreen(path: string) {
  return usageModules.find((mod) =>
    mod.screens.some((screen) =>
      screen === "/" ? path === "/" : path === screen || path.startsWith(screen + "/"),
    ),
  );
}

/** Módulo de uma rota de API ("/api/transactions/:id" → financeiro). */
export function moduleForApi(path: string) {
  const resource = path.split("/")[2];
  return usageModules.find((mod) => mod.apis.includes(resource));
}

/** SQL que devolve uma linha (module, at) por registro, de todos os módulos. */
export function recordsUnionSql() {
  const parts: string[] = [];
  for (const mod of usageModules) {
    for (const source of mod.records) {
      const where = source.where ? ` WHERE ${source.where}` : "";
      parts.push(
        source.viaDay
          ? `SELECT '${mod.key}' AS module, d."date" AS at FROM "${source.table}" t JOIN "Day" d ON d."id" = t."dayId"${where}`
          : `SELECT '${mod.key}' AS module, t."${source.at ?? "createdAt"}" AS at FROM "${source.table}" t${where}`,
      );
    }
  }
  return parts.join("\nUNION ALL\n");
}
