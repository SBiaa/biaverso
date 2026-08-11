import { z } from "zod";
import * as E from "@/app/generated/prisma/enums";

/**
 * Schemas de entrada das rotas de API. Os enums vêm do client gerado pelo
 * Prisma, então mudar o schema.prisma propaga a validação automaticamente.
 *
 * Convenção dos PATCH: campo ausente = "não mexe" (`undefined`), campo com
 * `null` explícito = "limpa". Antes vários PATCH tratavam ausente como null e
 * apagavam dados que a tela nem tinha enviado.
 */

// -------------------------------------------------------------- primitivos
const id = z.string().min(1);
const optionalId = z.string().min(1).nullish();
/** "YYYY-MM-DD" ou ISO — sempre vira meia-noite UTC. */
const dateOnly = z.coerce.date();
const text = z.string().trim().min(1, "não pode ficar vazio");
const optionalText = z.string().trim().nullish().transform((v) => v || null);
const money = z.coerce.number().finite().nonnegative();
const dayOfMonth = z.coerce.number().int().min(1).max(31);
const monthNumber = z.coerce.number().int().min(1).max(12);
const yearNumber = z.coerce.number().int().min(1970).max(2999);

/** Aceita "" como "sem filtro" — os selects mandam string vazia. */
const filter = <T extends z.ZodType>(inner: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), inner.optional());

// ------------------------------------------------------------------- dia
export const dayPatchSchema = z.object({
  mood: optionalText,
  energy: z.enum(E.Energy).nullish(),
  notes: z.string().nullish(),
  type: z.enum(E.DayType).optional(),
});

export const habitCreateSchema = z.object({ name: text });
export const habitPatchSchema = z.object({
  name: text.optional(),
  active: z.boolean().optional(),
});
export const habitLogPatchSchema = z.object({ done: z.boolean() });

export const waterLogSchema = z.object({
  dayId: id,
  count: z.coerce.number().int().min(0).max(30),
});

export const taskCreateSchema = z.object({
  title: text,
  origin: z.enum(E.Origin).default("PESSOAL"),
  dayId: optionalId,
  dueDate: dateOnly.nullish(),
});
export const taskPatchSchema = z.object({ done: z.boolean() });

export const routineCreateSchema = z.object({
  title: text,
  type: z.enum(["ROTINA_NORMAL", "ROTINA_FAXINA"]),
  order: z.coerce.number().int().min(0).optional(),
});
export const routinePatchSchema = z.object({
  title: text.optional(),
  order: z.coerce.number().int().min(0).optional(),
});

// -------------------------------------------------------------- cardápio
export const recipeSchema = z.object({
  title: text,
  category: z.enum(E.RecipeCategory),
  description: optionalText,
  ingredients: text,
  steps: text,
  prepTime: z.coerce.number().int().positive().nullish(),
});

export const mealPlanSchema = z.object({
  weekStart: dateOnly,
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  mealType: z.enum(E.MealType),
  recipeId: optionalId,
});

export const mealLogCreateSchema = z.object({
  dayId: id,
  mealType: z.enum(E.MealType),
  eaten: z.boolean().default(true),
});
export const mealLogPatchSchema = z.object({ eaten: z.boolean() });

// ------------------------------------------------------------- avaliação
export const weekReviewPatchSchema = z.object({
  effectiveness: z.enum(E.Stars).nullish(),
  energy: z.enum(E.Energy).nullish(),
  biggestBlock: z.enum(E.Block).nullish(),
  executedPlan: z.enum(E.Execution).nullish(),
  foodHydration: z.enum(E.Quality).nullish(),
  houseUpToDate: z.boolean().optional(),
  notes: z.string().nullish(),
  nextWeekFocus: z.string().nullish(),
  visionAlignment: z.string().nullish(),
});

export const monthReviewPatchSchema = z.object({
  effectiveness: z.enum(E.Stars).nullish(),
  highlights: z.string().nullish(),
  improvements: z.string().nullish(),
  nextMonthGoal: z.string().nullish(),
});

export const quarterReviewPatchSchema = z.object({
  highlights: z.string().nullish(),
  improvements: z.string().nullish(),
  nextQuarterGoal: z.string().nullish(),
});

// ------------------------------------------------------------ financeiro
export const transactionSchema = z.object({
  name: text,
  type: z.enum(E.TransactionType),
  amount: money,
  date: dateOnly,
  category: z.enum(E.TransactionCategory),
  payMethod: z.enum(E.PayMethod).nullish(),
  businessId: optionalId,
  notes: optionalText,
});

export const fixedBillSchema = z.object({
  name: text,
  amount: money,
  dueDay: dayOfMonth,
  type: z.enum(E.FixedBillType),
  paymentMethod: z.enum(E.PayMethod).default("PIX_DEBITO"),
  notes: optionalText,
});

export const fixedBillLogPatchSchema = z.object({
  status: z.enum(E.BillStatus).optional(),
  dueDate: dateOnly.optional(),
  // `null` explícito volta a valer o valor padrão da conta.
  amountOverride: money.nullish(),
});

/** Mês/ano de fatura vindos da query string das telas do financeiro. */
export const invoiceMonthQuerySchema = z.object({
  month: monthNumber,
  year: yearNumber,
});

/** Marcar/desmarcar a fatura do mês como paga. */
export const invoicePaymentSchema = z.object({
  month: monthNumber,
  year: yearNumber,
  status: z.enum(E.InvoiceStatus),
  paidAt: dateOnly.optional(),
  paidAmount: money.optional(),
  /** Lança junto a saída no caixa, ligada a esta fatura. */
  createTransaction: z.boolean().default(false),
});

export const creditCardSchema = z.object({
  name: optionalText,
  closingDay: dayOfMonth.nullish(),
  dueDay: dayOfMonth,
});

export const creditCardEntryCreateSchema = z.object({
  description: text,
  amount: money.positive(),
  purchaseDate: dateOnly,
  invoiceMonth: monthNumber,
  invoiceYear: yearNumber,
  // Teto real: mais que isso é engano de digitação, e cada parcela vira uma linha.
  installments: z.coerce.number().int().min(1).max(72).default(1),
  category: z.enum(E.TransactionCategory),
  businessId: optionalId,
  notes: optionalText,
});

export const creditCardEntryPatchSchema = z.object({
  description: text,
  amount: money.positive(),
  purchaseDate: dateOnly,
  invoiceMonth: monthNumber,
  invoiceYear: yearNumber,
  installment: optionalText,
  category: z.enum(E.TransactionCategory),
  businessId: optionalId,
  notes: optionalText,
});

/** Compra parcelada: uma chamada gera a parcela de cada fatura futura. */
export const installmentPurchaseSchema = z.object({
  description: text,
  totalAmount: money.positive(),
  installments: z.coerce.number().int().min(2).max(72),
  firstInvoiceMonth: monthNumber,
  firstInvoiceYear: yearNumber,
  purchaseDate: dateOnly.optional(),
  category: z.enum(E.TransactionCategory),
  businessId: optionalId,
  notes: optionalText,
});

export const financialRecordCreateSchema = z.object({
  name: text,
  type: z.enum(E.FinancialRecordType),
  totalAmount: money.positive(),
  installments: z.coerce.number().int().positive().nullish(),
  dueDay: dayOfMonth.nullish(),
  notes: optionalText,
});

/** Só um abatimento — o servidor recalcula o saldo e o status. */
export const financialRecordPaymentSchema = z.object({
  payment: money.positive(),
});

export const financialRecordPatchSchema = z.object({
  name: text.optional(),
  totalAmount: money.positive().optional(),
  paidAmount: money.optional(),
  installments: z.coerce.number().int().positive().nullish(),
  dueDay: dayOfMonth.nullish(),
  notes: z.string().nullish(),
});

// -------------------------------------------------------------- negócios
export const businessCreateSchema = z.object({
  name: text,
  description: optionalText,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "precisa ser uma cor #RRGGBB").optional(),
  icon: optionalText,
  // Ausente = deixa como está (no create, cai nos módulos padrão).
  modules: z.array(z.enum(E.ModuleType)).optional(),
});
export const businessPatchSchema = businessCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

/** Lista inteira dos módulos do negócio: a ordem do array vira `order`. */
export const businessModulesPatchSchema = z.object({
  modules: z.array(
    z.object({
      module: z.enum(E.ModuleType),
      active: z.boolean(),
    }),
  ),
});

export const clientCreateSchema = z.object({
  name: text,
  email: z.email("e-mail inválido").nullish().or(z.literal("").transform(() => null)),
  phone: optionalText,
  instagram: optionalText,
  notes: optionalText,
  businessId: id,
});
export const clientPatchSchema = clientCreateSchema.omit({ businessId: true }).partial();

export const businessLinkSchema = z.object({ businessId: id });
export const clientBusinessPatchSchema = z.object({ status: z.enum(E.ClientStatus) });

export const projectCreateSchema = z.object({
  name: text,
  description: optionalText,
  status: z.enum(E.ProjectStatus).default("EM_ANDAMENTO"),
  startDate: dateOnly.nullish(),
  endDate: dateOnly.nullish(),
  businessId: id,
  clientId: optionalId,
  isInternal: z.boolean().default(false),
});
export const projectPatchSchema = projectCreateSchema
  .omit({ businessId: true, clientId: true })
  .partial()
  // A documentação é texto livre: string vazia é um valor legítimo ("limpei o
  // conteúdo"), então aqui não vale o `optionalText` que troca "" por null.
  .extend({ content: z.string().nullish(), clientId: optionalId });

export const projectTaskCreateSchema = z.object({
  title: text,
  dueDate: dateOnly.nullish(),
});

// ------------------------------------------------- documentos do projeto
export const projectDocumentCreateSchema = z.object({
  title: text,
  url: text,
  type: z.enum(E.DocumentType).default("LINK"),
  notes: optionalText,
});
export const projectDocumentPatchSchema = projectDocumentCreateSchema.partial();

// ------------------------------------------------ credenciais do projeto
export const projectCredentialCreateSchema = z.object({
  passwordEntryId: id,
});

// -------------------------------------------- tabela de preços do projeto
export const projectPriceCreateSchema = z.object({
  name: text,
  description: optionalText,
  price: money,
  unit: optionalText,
});
export const projectPricePatchSchema = projectPriceCreateSchema
  .partial()
  .extend({ order: z.coerce.number().int().min(0).optional() });

// ------------------------------------------------- tarefas das coleções
export const collectionTaskCreateSchema = z.object({
  title: text,
  description: optionalText,
  dueDate: dateOnly.nullish(),
});
export const collectionTaskPatchSchema = collectionTaskCreateSchema
  .partial()
  .extend({
    done: z.boolean().optional(),
    order: z.coerce.number().int().min(0).optional(),
  });

/** Reordenação por drag-and-drop: a lista inteira na ordem nova. */
export const reorderSchema = z.object({
  ids: z.array(id).min(1),
});

export const projectsOverviewQuerySchema = z.object({
  businessId: filter(id),
});

// -------------------------------------------------------------------- ace
export const contentPostCreateSchema = z.object({
  title: text,
  type: z.enum(E.PostType),
  network: z.enum(E.SocialNetwork),
  status: z.enum(E.ContentStatus).default("PLANEJADO"),
  publishDate: dateOnly.nullish(),
  completedAt: z.coerce.date().nullish(),
  businessId: id,
  // Sem cliente = conteúdo interno do próprio negócio.
  clientId: optionalId,
  projectId: optionalId,
  caption: optionalText,
  notes: optionalText,
});
export const contentPostPatchSchema = contentPostCreateSchema
  .omit({ businessId: true, status: true })
  .partial()
  .extend({ status: z.enum(E.ContentStatus).optional() });

export const productionTaskCreateSchema = z.object({
  title: text,
  type: z.enum(E.ProductionType),
  description: optionalText,
  priority: z.enum(E.Priority).default("NORMAL"),
  status: z.enum(E.ProductionStatus).default("A_FAZER"),
  dueDate: dateOnly.nullish(),
  completedAt: z.coerce.date().nullish(),
  businessId: id,
  // Sem cliente = tarefa interna do próprio negócio.
  clientId: optionalId,
  projectId: optionalId,
  notes: optionalText,
});
export const productionTaskPatchSchema = productionTaskCreateSchema
  .omit({ businessId: true, status: true })
  .partial()
  .extend({ status: z.enum(E.ProductionStatus).optional() });

export const aceListQuerySchema = z.object({
  businessId: filter(id),
  clientId: filter(id),
  projectId: filter(id),
  status: filter(z.string()),
  type: filter(z.string()),
  network: filter(z.enum(E.SocialNetwork)),
  priority: filter(z.enum(E.Priority)),
  from: filter(dateOnly),
  to: filter(dateOnly),
  scope: filter(z.enum(["clientes", "interno"])),
});

// ------------------------------------------------------------------- loja
export const orderCreateSchema = z.object({
  orderNumber: optionalText,
  customerName: text,
  customerContact: optionalText,
  items: text,
  totalAmount: money,
  status: z.enum(E.OrderStatus).default("PENDENTE"),
  orderDate: dateOnly,
  dueDate: dateOnly.nullish(),
  completedAt: z.coerce.date().nullish(),
  notes: optionalText,
  businessId: id,
  collectionId: optionalId,
});
export const orderPatchSchema = orderCreateSchema
  .omit({ businessId: true, status: true, orderDate: true })
  .partial()
  .extend({
    status: z.enum(E.OrderStatus).optional(),
    orderDate: dateOnly.optional(),
  });

export const orderListQuerySchema = z.object({
  businessId: filter(id),
  collectionId: filter(id),
  status: filter(z.enum(E.OrderStatus)),
});

export const collectionCreateSchema = z.object({
  name: text,
  description: optionalText,
  season: optionalText,
  status: z.enum(E.CollectionStatus).default("IDEIA"),
  launchDate: dateOnly.nullish(),
  businessId: id,
});
export const collectionPatchSchema = collectionCreateSchema
  .omit({ businessId: true, status: true })
  .partial()
  .extend({ status: z.enum(E.CollectionStatus).optional() });

export const collectionListQuerySchema = z.object({
  businessId: filter(id),
  status: filter(z.enum(E.CollectionStatus)),
});

export const collectionProductCreateSchema = z.object({
  name: text,
  description: optionalText,
  price: money.nullish(),
  cost: money.nullish(),
  // Só http(s): um "javascript:" aqui viraria src executável no card do produto.
  imageUrl: z
    .union([z.url(), z.literal("")])
    .nullish()
    .transform((v) => v || null)
    .refine((v) => !v || /^https?:\/\//i.test(v), "o link precisa começar com http:// ou https://"),
  notes: optionalText,
});
export const collectionProductPatchSchema = collectionProductCreateSchema.partial();

// ---------------------------------------------------------- configurações
export const settingsPatchSchema = z.object({
  // Tetos de sanidade: mais que isso é engano de digitação.
  waterGoal: z.coerce.number().int().min(1).max(30).optional(),
  waterUnitMl: z.coerce.number().int().min(50).max(2000).optional(),
});

// -------------------------------------------------------------- biblioteca
export const bookCreateSchema = z.object({
  title: text,
  author: optionalText,
  status: z.enum(E.BookStatus).default("QUERO_LER"),
  totalPages: z.coerce.number().int().positive().nullish(),
  currentPage: z.coerce.number().int().positive().nullish(),
});
export const bookPatchSchema = z.object({
  status: z.enum(E.BookStatus).optional(),
  rating: z.coerce.number().int().min(1).max(5).nullish(),
  notes: z.string().nullish(),
  totalPages: z.coerce.number().int().positive().nullish(),
  currentPage: z.coerce.number().int().min(0).nullish(),
});

export const knowledgeSchema = z.object({
  title: text,
  source: optionalText,
  type: z.enum(E.KnowledgeType),
  area: z.enum(E.KnowledgeArea),
  summary: optionalText,
  link: optionalText,
});

export const ideaCreateSchema = z.object({
  title: text,
  description: optionalText,
  businessId: optionalId,
});
export const ideaPatchSchema = z.object({
  title: text.optional(),
  description: z.string().nullish(),
  status: z.enum(E.IdeaStatus).optional(),
  businessId: optionalId,
});

export const passwordSchema = z.object({
  name: text,
  login: optionalText,
  password: z.string().min(1, "não pode ficar vazia"),
  // Só http(s): um "javascript:" aqui viraria link executável na lista.
  url: z
    .union([z.url(), z.literal("")])
    .nullish()
    .transform((v) => v || null)
    .refine((v) => !v || /^https?:\/\//i.test(v), "o link precisa começar com http:// ou https://"),
  category: z.enum(E.PasswordCategory).default("OUTRO"),
  notes: optionalText,
});
export const passwordPatchSchema = passwordSchema.partial();

// ------------------------------------------------------------------ visão
export const pillarCreateSchema = z.object({
  name: text,
  description: optionalText,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "precisa ser uma cor #RRGGBB").optional(),
  icon: optionalText,
  order: z.coerce.number().int().min(0).default(0),
});
export const pillarPatchSchema = pillarCreateSchema.partial();

export const principleSchema = z.object({
  title: text,
  body: z.string().nullish(),
  pillarId: optionalId,
});
export const principlePatchSchema = principleSchema.partial();

export const desireSchema = z.object({
  title: text,
  description: z.string().nullish(),
  pillarId: optionalId,
});
export const desirePatchSchema = desireSchema.partial();

export const conceptualGoalCreateSchema = z.object({
  title: text,
  description: z.string().nullish(),
  pillarId: id,
});
export const conceptualGoalPatchSchema = conceptualGoalCreateSchema.partial();

export const measuredGoalCreateSchema = z.object({
  title: text,
  target: optionalText,
  deadline: dateOnly.nullish(),
  status: z.enum(E.MeasuredGoalStatus).default("EM_ANDAMENTO"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  conceptualGoalId: id,
});
export const measuredGoalPatchSchema = measuredGoalCreateSchema.partial();

export const moodboardCreateSchema = z.object({
  type: z.enum(E.MoodboardType),
  content: text,
  caption: optionalText,
});
export const moodboardPatchSchema = moodboardCreateSchema.partial().extend({
  order: z.coerce.number().int().min(0).optional(),
});

export const pillarIdQuerySchema = z.object({ pillarId: filter(id) });
export const conceptualGoalIdQuerySchema = z.object({ conceptualGoalId: filter(id) });

// ---------------------------------------------------------------- agenda
/**
 * "HH:mm" no fuso do app. Aceita o que os `<input type="time">` mandam
 * ("9:05", "09:05:30") e trata string vazia como "sem hora". Campo ausente
 * continua `undefined`, para o PATCH saber a diferença entre limpar e não mexer.
 */
const timeOfDay = z
  .string()
  .trim()
  .nullish()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (!value) return null;

    const match = /^(\d{1,2}):(\d{2})/.exec(value);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  });

/** Ausente = não mexe; `null` ou "" = limpa. */
const patchText = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value === undefined ? undefined : value || null));

export const eventCreateSchema = z.object({
  title: text,
  description: optionalText,
  date: dateOnly,
  time: timeOfDay,
  endTime: timeOfDay,
  allDay: z.boolean().default(false),
  category: z.enum(E.EventCategory).default("PESSOAL"),
});

export const eventPatchSchema = z.object({
  title: text.optional(),
  description: patchText,
  date: dateOnly.optional(),
  time: timeOfDay,
  endTime: timeOfDay,
  allDay: z.boolean().optional(),
  category: z.enum(E.EventCategory).optional(),
});

// ------------------------------------------------------------------ beleza
/** Tetos de sanidade: intervalo de cuidado em dias e PAO em meses. */
const intervalDays = z.coerce.number().int().min(1).max(365);
const paoMonths = z.coerce.number().int().min(1).max(120);
const orderIndex = z.coerce.number().int().min(0);

/**
 * Gasto de beleza pode virar lançamento no financeiro. É opt-in: só cria a
 * Transaction quando a tela marca a caixinha, para registrar custo não sair
 * mexendo no caixa sem a dona pedir.
 */
const createTransaction = z.boolean().default(false);

export const careRoutineCreateSchema = z.object({
  name: text,
  timeOfDay: z.enum(E.RoutineTime).default("QUALQUER"),
});
export const careRoutinePatchSchema = z.object({
  name: text.optional(),
  timeOfDay: z.enum(E.RoutineTime).optional(),
  active: z.boolean().optional(),
  order: orderIndex.optional(),
});

export const careRoutineStepCreateSchema = z.object({
  title: text,
  notes: optionalText,
  productId: optionalId,
});
export const careRoutineStepPatchSchema = careRoutineStepCreateSchema
  .partial()
  .extend({ order: orderIndex.optional() });

/** Reordenação por arrastar: a posição no array vira o `order`. */
export const stepsReorderSchema = z.object({ ids: z.array(id).min(1) });

/** Marcar a rotina do dia. Sem `date`, o servidor usa hoje. */
export const careRoutineLogSchema = z.object({
  date: dateOnly.optional(),
  done: z.boolean().default(true),
});

export const careScheduleCreateSchema = z.object({
  name: text,
  description: optionalText,
});
export const careSchedulePatchSchema = careScheduleCreateSchema.partial().extend({
  active: z.boolean().optional(),
  currentStep: orderIndex.optional(),
});

export const careScheduleStepCreateSchema = z.object({
  title: text,
  description: optionalText,
  intervalDays: intervalDays.default(7),
  productId: optionalId,
});
export const careScheduleStepPatchSchema = careScheduleStepCreateSchema
  .partial()
  .extend({ order: orderIndex.optional() });

/**
 * Registrar a etapa atual do ciclo. `stepId` só é aceito para corrigir a mão —
 * sem ele vale o `currentStep` gravado no cronograma.
 */
export const careScheduleLogSchema = z.object({
  date: dateOnly.optional(),
  stepId: optionalId,
  notes: optionalText,
});

export const careAppointmentCreateSchema = z.object({
  name: text,
  type: z.enum(E.CareType).default("OUTRO"),
  intervalDays,
  lastDoneAt: dateOnly.nullish(),
  notes: optionalText,
});
export const careAppointmentPatchSchema = careAppointmentCreateSchema
  .partial()
  .extend({ active: z.boolean().optional() });

export const careAppointmentLogSchema = z.object({
  date: dateOnly.optional(),
  cost: money.nullish(),
  notes: optionalText,
  createTransaction,
});

export const beautyProductCreateSchema = z.object({
  name: text,
  brand: optionalText,
  category: z.enum(E.ProductCategory).default("OUTRO"),
  openedAt: dateOnly.nullish(),
  // Ignorado quando `openedAt` + `pao` existem: aí a validade é derivada.
  expiresAt: dateOnly.nullish(),
  pao: paoMonths.nullish(),
  cost: money.nullish(),
  notes: optionalText,
  createTransaction,
});
export const beautyProductPatchSchema = beautyProductCreateSchema
  .omit({ createTransaction: true })
  .partial()
  .extend({
    finished: z.boolean().optional(),
    runningLow: z.boolean().optional(),
  });

export const beautyProductQuerySchema = z.object({
  category: filter(z.enum(E.ProductCategory)),
  status: filter(z.enum(["ativos", "acabados", "todos"])),
});
