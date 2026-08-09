import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { materializeRoutineTasks } from "../lib/day";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

async function main() {
  // Limpa dados de exemplo antes de recriar (seed idempotente em dev).
  await prisma.productionTask.deleteMany();
  await prisma.contentPost.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.mealLog.deleteMany();
  await prisma.mealPlan.deleteMany();
  await prisma.event.deleteMany();
  await prisma.task.deleteMany();
  await prisma.waterLog.deleteMany();
  await prisma.habitLog.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.day.deleteMany();
  await prisma.fixedBillLog.deleteMany();
  await prisma.fixedBill.deleteMany();
  await prisma.creditCardEntry.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.clientBusiness.deleteMany();
  await prisma.client.deleteMany();
  await prisma.book.deleteMany();
  await prisma.knowledge.deleteMany();
  await prisma.idea.deleteMany();
  await prisma.passwordEntry.deleteMany();
  await prisma.project.deleteMany();
  await prisma.business.deleteMany();

  const date = today();

  const ace = await prisma.business.create({
    data: { name: "Ace", color: "#DC2626", icon: "briefcase" },
  });
  const tarot = await prisma.business.create({
    data: { name: "Biatrix Tarot", color: "#7C3AED", icon: "moon" },
  });
  const creative = await prisma.business.create({
    data: { name: "Creative", color: "#059669", icon: "palette" },
  });

  await prisma.task.createMany({
    data: [
      { title: "Arrumar a cama", origin: "CASA", type: "ROTINA_NORMAL", order: 0 },
      { title: "Lavar a louça do dia", origin: "CASA", type: "ROTINA_NORMAL", order: 1 },
      { title: "Organizar a mesa de trabalho", origin: "CASA", type: "ROTINA_NORMAL", order: 2 },
      { title: "Aspirar a casa", origin: "CASA", type: "ROTINA_FAXINA", order: 0 },
      { title: "Limpar o banheiro", origin: "CASA", type: "ROTINA_FAXINA", order: 1 },
      { title: "Trocar a roupa de cama", origin: "CASA", type: "ROTINA_FAXINA", order: 2 },
      { title: "Tirar o pó dos móveis", origin: "CASA", type: "ROTINA_FAXINA", order: 3 },
    ],
  });

  const day = await prisma.day.create({
    data: { date, type: "NORMAL", mood: "😊", energy: "MEDIA" },
  });
  await materializeRoutineTasks(day);

  const habitNames = ["Meditar", "Exercitar-se", "Leitura", "Skincare"];
  for (const [i, name] of habitNames.entries()) {
    const habit = await prisma.habit.create({ data: { name } });
    await prisma.habitLog.create({
      data: { habitId: habit.id, dayId: day.id, done: i < 2 },
    });
  }

  await prisma.waterLog.createMany({
    data: Array.from({ length: 3 }, () => ({ dayId: day.id, amount: 300 })),
  });

  await prisma.task.createMany({
    data: [
      { title: "Responder e-mails", origin: "PESSOAL", dueDate: date, done: true, dayId: day.id },
      { title: "Publicar post do dia", origin: "ACE", dueDate: date, dayId: day.id },
      { title: "Preparar tiragem de tarot", origin: "BIATRIX_TAROT", dueDate: date, dayId: day.id },
      { title: "Revisar arte da semana", origin: "CREATIVE", dueDate: date, dayId: day.id },
    ],
  });

  await prisma.event.createMany({
    data: [
      { title: "Sessão de tarot - cliente Marina", date, time: "10:00", category: "TAROT", dayId: day.id },
      { title: "Gravação Creative", date, time: "14:00", category: "CREATIVE", dayId: day.id },
      { title: "Consulta médica", date, time: "17:30", category: "SAUDE", dayId: day.id },
    ],
  });

  const cafe = await prisma.recipe.create({
    data: {
      title: "Vitamina de banana",
      category: "CAFE_DA_MANHA",
      ingredients: "Banana, leite, aveia",
      steps: "Bater tudo no liquidificador.",
      prepTime: 5,
    },
  });
  const almoco = await prisma.recipe.create({
    data: {
      title: "Arroz, feijão e frango grelhado",
      category: "ALMOCO",
      ingredients: "Arroz, feijão, peito de frango",
      steps: "Temperar e grelhar o frango; servir com arroz e feijão.",
      prepTime: 30,
    },
  });

  await prisma.mealLog.createMany({
    data: [
      { dayId: day.id, mealType: "CAFE_DA_MANHA", recipeId: cafe.id, eaten: true },
      { dayId: day.id, mealType: "ALMOCO", recipeId: almoco.id, eaten: false },
      { dayId: day.id, mealType: "JANTAR", eaten: false },
    ],
  });

  await prisma.transaction.createMany({
    data: [
      { name: "Leitura de tarot - Marina", type: "ENTRADA", amount: 150, date, businessId: tarot.id, category: "RECEITA_VENDA" },
      { name: "Pacote de posts - cliente Ace", type: "ENTRADA", amount: 800, date, businessId: ace.id, category: "RECEITA_VENDA" },
      { name: "Arte comissionada", type: "ENTRADA", amount: 300, date, businessId: creative.id, category: "RECEITA_VENDA" },
      { name: "Supermercado", type: "SAIDA", amount: 210.5, date, category: "ALIMENTACAO", payMethod: "PIX_DEBITO" },
      { name: "Assinatura Adobe", type: "SAIDA", amount: 129.9, date, businessId: creative.id, category: "ASSINATURA", payMethod: "CARTAO_CREDITO" },
      { name: "Ração dos gatos", type: "SAIDA", amount: 89.9, date, category: "GATOS", payMethod: "PIX_DEBITO" },
    ],
  });

  const currentMonth = date.getMonth() + 1;
  const currentYear = date.getFullYear();

  const netflix = await prisma.fixedBill.create({
    data: { name: "Netflix", amount: 44.9, dueDay: 10, type: "ASSINATURA_PESSOAL" },
  });
  const adobe = await prisma.fixedBill.create({
    data: { name: "Adobe Creative Cloud", amount: 129.9, dueDay: 15, type: "ASSINATURA_TRABALHO" },
  });
  const aluguel = await prisma.fixedBill.create({
    data: { name: "Aluguel", amount: 1800, dueDay: 5, type: "CONTA_CASA" },
  });
  const internet = await prisma.fixedBill.create({
    data: { name: "Internet", amount: 99.9, dueDay: 20, type: "CONTA_CASA" },
  });

  await prisma.fixedBillLog.createMany({
    data: [
      { fixedBillId: netflix.id, month: currentMonth, year: currentYear, status: "PAGO", paidAt: date },
      { fixedBillId: adobe.id, month: currentMonth, year: currentYear, status: "PENDENTE" },
      { fixedBillId: aluguel.id, month: currentMonth, year: currentYear, status: "PAGO", paidAt: date },
      { fixedBillId: internet.id, month: currentMonth, year: currentYear, status: "ATRASADO" },
    ],
  });

  await prisma.creditCardEntry.createMany({
    data: [
      {
        description: "Assinatura Adobe",
        amount: 129.9,
        purchaseDate: date,
        invoiceMonth: currentMonth,
        invoiceYear: currentYear,
        category: "ASSINATURA",
        businessId: creative.id,
      },
      {
        description: "Material de papelaria",
        amount: 65.3,
        purchaseDate: date,
        invoiceMonth: currentMonth,
        invoiceYear: currentYear,
        category: "CUSTO_OPERACIONAL",
        businessId: ace.id,
      },
      {
        description: "Farmácia",
        amount: 48.2,
        purchaseDate: date,
        invoiceMonth: currentMonth,
        invoiceYear: currentYear,
        category: "GASTO_PESSOAL",
      },
    ],
  });

  await prisma.financialRecord.createMany({
    data: [
      {
        name: "Empréstimo pessoal",
        type: "DIVIDA",
        totalAmount: 3000,
        paidAmount: 900,
        installments: 12,
        dueDay: 8,
        status: "PARCIAL",
      },
      {
        name: "Reserva de emergência",
        type: "INVESTIMENTO",
        totalAmount: 5400,
        paidAmount: 5400,
        status: "QUITADO",
        notes: "CDB liquidez diária - Nubank",
      },
    ],
  });

  const marina = await prisma.client.create({
    data: {
      name: "Marina Souza",
      email: "marina.souza@example.com",
      phone: "(11) 91234-5678",
      instagram: "@marinasouza",
      businessLinks: {
        create: [
          { businessId: tarot.id, status: "ATIVO" },
          { businessId: ace.id, status: "ATIVO" },
        ],
      },
    },
  });
  const rafael = await prisma.client.create({
    data: {
      name: "Rafael Lima",
      email: "rafael.lima@example.com",
      instagram: "@rafaellima",
      businessLinks: {
        create: [{ businessId: ace.id, status: "ATIVO" }],
      },
    },
  });
  await prisma.client.create({
    data: {
      name: "Camila Torres",
      phone: "(21) 99876-5432",
      businessLinks: {
        create: [{ businessId: creative.id, status: "PAUSADO" }],
      },
    },
  });
  await prisma.client.create({
    data: {
      name: "João Pedro Alves",
      email: "joao.alves@example.com",
      businessLinks: {
        create: [{ businessId: tarot.id, status: "INATIVO" }],
      },
    },
  });

  await prisma.book.createMany({
    data: [
      {
        title: "Mulheres que Correm com os Lobos",
        author: "Clarissa Pinkola Estés",
        status: "LIDO",
        rating: 5,
        notes: "Reconectou muita coisa sobre intuição e ciclos femininos.",
      },
      {
        title: "O Poder do Hábito",
        author: "Charles Duhigg",
        status: "LENDO",
      },
      {
        title: "Tarot e Psicologia Junguiana",
        author: "Sallie Nichols",
        status: "QUERO_LER",
      },
    ],
  });

  await prisma.knowledge.createMany({
    data: [
      {
        title: "Como precificar serviços criativos",
        type: "VIDEO",
        area: "NEGOCIOS",
        source: "YouTube",
        summary: "Precificar por valor entregue, não por hora trabalhada.",
      },
      {
        title: "Introdução ao App Router do Next.js",
        type: "ARTIGO",
        area: "PROGRAMACAO",
        source: "nextjs.org/docs",
      },
      {
        title: "Arquétipos no Tarot",
        type: "CURSO",
        area: "ESPIRITUALIDADE",
      },
    ],
  });

  await prisma.idea.createMany({
    data: [
      {
        title: "Pacote de tiragens mensais recorrentes",
        description: "Assinatura mensal com uma tiragem por mês.",
        businessId: tarot.id,
        status: "EM_ANALISE",
      },
      {
        title: "Série de posts sobre bastidores da agência",
        businessId: ace.id,
        status: "SOLTA",
      },
      {
        title: "Linha de adesivos com as artes da Creative",
        businessId: creative.id,
        status: "SOLTA",
      },
    ],
  });

  const rebranding = await prisma.project.create({
    data: {
      name: "Rebranding cliente Marina",
      description: "Nova identidade visual para o perfil da Marina.",
      status: "EM_ANDAMENTO",
      startDate: date,
      businessId: ace.id,
      clientId: marina.id,
      tasks: {
        create: [
          { title: "Definir paleta de cores", type: "AVULSA", dueDate: date, done: true, businessId: ace.id },
          { title: "Criar novo logo", type: "AVULSA", businessId: ace.id },
        ],
      },
    },
  });

  const todayUtc = utcDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const lastMonthRef = new Date(date.getFullYear(), date.getMonth() - 1, 1);

  await prisma.contentPost.createMany({
    data: [
      {
        title: "Reels bastidores do rebranding",
        type: "REELS",
        network: "INSTAGRAM",
        status: "APROVADO",
        publishDate: utcDate(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() + 1, todayUtc.getUTCDate() + 2),
        clientId: marina.id,
        businessId: ace.id,
        projectId: rebranding.id,
      },
      {
        title: "Carrossel antes e depois da marca",
        type: "CARROSSEL",
        network: "INSTAGRAM",
        status: "PUBLICADO",
        publishDate: utcDate(lastMonthRef.getFullYear(), lastMonthRef.getMonth() + 1, 10),
        completedAt: utcDate(lastMonthRef.getFullYear(), lastMonthRef.getMonth() + 1, 10),
        clientId: marina.id,
        businessId: ace.id,
        projectId: rebranding.id,
      },
      {
        title: "Story enquete nova logo",
        type: "STORY",
        network: "INSTAGRAM",
        status: "PLANEJADO",
        publishDate: utcDate(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() + 1, todayUtc.getUTCDate() + 5),
        clientId: marina.id,
        businessId: ace.id,
      },
      {
        title: "Feed foto lançamento produto",
        type: "FEED_FOTO",
        network: "INSTAGRAM",
        status: "EM_CRIACAO",
        publishDate: utcDate(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() + 1, todayUtc.getUTCDate() + 1),
        clientId: rafael.id,
        businessId: ace.id,
      },
      {
        title: "Story making of da produção",
        type: "STORY",
        network: "INSTAGRAM",
        status: "PLANEJADO",
        publishDate: utcDate(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() + 1, todayUtc.getUTCDate() - 2),
        clientId: rafael.id,
        businessId: ace.id,
      },
    ],
  });

  await prisma.productionTask.createMany({
    data: [
      {
        title: "Criar novo logo",
        type: "CRIACAO_ARTE",
        priority: "URGENTE",
        status: "EM_ANDAMENTO",
        dueDate: todayUtc,
        clientId: marina.id,
        businessId: ace.id,
        projectId: rebranding.id,
      },
      {
        title: "Editar vídeo de bastidores",
        type: "EDICAO_VIDEO",
        priority: "NORMAL",
        status: "A_FAZER",
        dueDate: utcDate(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() + 1, todayUtc.getUTCDate() + 3),
        clientId: marina.id,
        businessId: ace.id,
        projectId: rebranding.id,
      },
      {
        title: "Revisar proposta de site",
        type: "SITE",
        priority: "NORMAL",
        status: "AGUARDANDO_APROVACAO",
        dueDate: utcDate(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() + 1, todayUtc.getUTCDate() - 4),
        clientId: marina.id,
        businessId: ace.id,
      },
      {
        title: "Criar paleta secundária",
        type: "CRIACAO_ARTE",
        priority: "NORMAL",
        status: "CONCLUIDO",
        dueDate: utcDate(lastMonthRef.getFullYear(), lastMonthRef.getMonth() + 1, 5),
        completedAt: utcDate(lastMonthRef.getFullYear(), lastMonthRef.getMonth() + 1, 12),
        clientId: marina.id,
        businessId: ace.id,
        projectId: rebranding.id,
      },
      {
        title: "Fotografar produtos novos",
        type: "FOTOGRAFIA",
        priority: "NORMAL",
        status: "A_FAZER",
        dueDate: utcDate(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() + 1, todayUtc.getUTCDate() + 7),
        clientId: rafael.id,
        businessId: ace.id,
      },
    ],
  });

  await prisma.project.create({
    data: {
      name: "Curso de Tarot para iniciantes",
      description: "Estruturar módulos e material do curso online.",
      status: "PAUSADO",
      businessId: tarot.id,
      tasks: {
        create: [
          { title: "Esboçar ementa do curso", type: "AVULSA", businessId: tarot.id },
        ],
      },
    },
  });

  await prisma.passwordEntry.createMany({
    data: [
      {
        name: "Instagram @biatrixtarot",
        login: "biatrixtarot@example.com",
        password: "exemplo-senha-123",
        category: "REDES_SOCIAIS",
        url: "https://instagram.com",
      },
      {
        name: "Adobe Creative Cloud",
        login: "creative@example.com",
        password: "exemplo-senha-456",
        category: "FERRAMENTAS",
      },
      {
        name: "Netflix",
        login: "pessoal@example.com",
        password: "exemplo-senha-789",
        category: "STREAMING",
      },
    ],
  });

  console.log("Seed concluído para", date.toISOString());
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
