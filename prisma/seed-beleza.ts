import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

/**
 * Ponto de partida do módulo de beleza: uma rotina de skincare e o cronograma
 * capilar clássico, para a tela não abrir vazia.
 *
 * De propósito NÃO está registrado como `seed` no prisma.config.ts — o banco
 * guarda só dados reais e nada aqui é recriado sozinho. Rode uma vez, na mão:
 *
 *   npx tsx prisma/seed-beleza.ts
 *
 * Rodar de novo não duplica: cada item só é criado se ainda não existir com
 * aquele nome. Pode apagar tudo pela tela depois sem quebrar nada.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seedRoutine() {
  const name = "Skincare manhã";
  if (await prisma.careRoutine.findFirst({ where: { name } })) {
    console.log(`· "${name}" já existe, pulando.`);
    return;
  }

  await prisma.careRoutine.create({
    data: {
      name,
      timeOfDay: "MANHA",
      steps: {
        create: [
          { title: "Limpeza", order: 0 },
          { title: "Tônico", order: 1 },
          { title: "Hidratante", order: 2 },
          { title: "Protetor solar", order: 3 },
        ],
      },
    },
  });
  console.log(`✔ "${name}" criada com 4 passos.`);
}

async function seedSchedule() {
  const name = "Cronograma capilar";
  if (await prisma.careSchedule.findFirst({ where: { name } })) {
    console.log(`· "${name}" já existe, pulando.`);
    return;
  }

  await prisma.careSchedule.create({
    data: {
      name,
      description: "Hidratação, nutrição e reconstrução, girando a cada 7 dias.",
      steps: {
        create: [
          { title: "Hidratação", order: 0, intervalDays: 7 },
          { title: "Nutrição", order: 1, intervalDays: 7 },
          { title: "Reconstrução", order: 2, intervalDays: 7 },
        ],
      },
    },
  });
  console.log(`✔ "${name}" criado com 3 etapas.`);
}

async function main() {
  await seedRoutine();
  await seedSchedule();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
