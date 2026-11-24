import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

/**
 * Revisão do tarô: uma carta por dia, arcanos maiores primeiro e depois os
 * menores (um curso por naipe). Cada carta é uma aula agendada para um dia,
 * então ela aparece sozinha no "Dia a dia" na data certa.
 *
 * Fora do `seed` do prisma.config.ts de propósito (o banco guarda só dados
 * reais). Rode uma vez, na mão:
 *
 *   npx tsx prisma/seed-taro.ts            # começa hoje
 *   npx tsx prisma/seed-taro.ts 2026-10-10 # começa em outra data
 *
 * Rodar de novo não duplica: se a área "Tarô" já existe, não faz nada.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const MAIORES = [
  "0 · O Louco",
  "I · O Mago",
  "II · A Sacerdotisa",
  "III · A Imperatriz",
  "IV · O Imperador",
  "V · O Hierofante",
  "VI · Os Enamorados",
  "VII · O Carro",
  "VIII · A Força",
  "IX · O Eremita",
  "X · A Roda da Fortuna",
  "XI · A Justiça",
  "XII · O Enforcado",
  "XIII · A Morte",
  "XIV · A Temperança",
  "XV · O Diabo",
  "XVI · A Torre",
  "XVII · A Estrela",
  "XVIII · A Lua",
  "XIX · O Sol",
  "XX · O Julgamento",
  "XXI · O Mundo",
];

const NUMEROS = ["Ás", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Valete", "Cavaleiro", "Rainha", "Rei"];
const NAIPES = [
  { nome: "Paus", de: "de Paus" },
  { nome: "Copas", de: "de Copas" },
  { nome: "Espadas", de: "de Espadas" },
  { nome: "Ouros", de: "de Ouros" },
];

function startDate(): Date {
  const arg = process.argv[2];
  if (arg) {
    const d = new Date(`${arg}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) throw new Error(`Data inválida: ${arg} (use AAAA-MM-DD)`);
    return d;
  }
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function main() {
  if (await prisma.studyArea.findFirst({ where: { name: "Tarô" } })) {
    console.log('· Área "Tarô" já existe, nada a fazer.');
    return;
  }

  let day = startDate();
  const nextDay = () => {
    const d = day;
    day = addDays(day, 1);
    return d;
  };

  const last = await prisma.studyArea.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
  const area = await prisma.studyArea.create({
    data: { name: "Tarô", emoji: "🔮", order: (last?.order ?? -1) + 1 },
  });

  const maiores = await prisma.studySubject.create({
    data: {
      areaId: area.id,
      name: "Arcanos Maiores",
      description: "Revisão: uma carta por dia, de O Louco a O Mundo.",
      order: 0,
    },
  });
  await prisma.studyCourse.create({
    data: {
      subjectId: maiores.id,
      title: "Revisão dos Arcanos Maiores",
      notes: "Para cada carta: palavras-chave, imagem, luz e sombra, e como ela aparece numa leitura.",
      lessons: {
        create: MAIORES.map((title, order) => ({ title, order, scheduledDate: nextDay() })),
      },
    },
  });

  const menores = await prisma.studySubject.create({
    data: {
      areaId: area.id,
      name: "Arcanos Menores",
      description: "Revisão: uma carta por dia, naipe por naipe.",
      order: 1,
    },
  });
  for (const naipe of NAIPES) {
    await prisma.studyCourse.create({
      data: {
        subjectId: menores.id,
        title: `Naipe de ${naipe.nome}`,
        lessons: {
          create: NUMEROS.map((numero, order) => ({
            title: `${numero} ${naipe.de}`,
            order,
            scheduledDate: nextDay(),
          })),
        },
      },
    });
  }

  console.log(`✓ Tarô criado: 78 cartas, de ${startDate().toISOString().slice(0, 10)} a ${addDays(day, -1).toISOString().slice(0, 10)}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
