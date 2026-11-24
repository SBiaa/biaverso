import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { encrypt, isEncrypted } from "../lib/crypto";

/**
 * Converte o que já está gravado em texto simples: as senhas do cofre e os
 * tokens do Google.
 *
 * Rode uma vez, na mão, depois de definir a ENCRYPTION_KEY no .env:
 *
 *   npx tsx prisma/encrypt-existing.ts
 *
 * Rodar de novo não estraga nada: o que já está cifrado é reconhecido pelo
 * prefixo "v1:" e fica como está. O app funciona antes e depois — o `decrypt`
 * devolve texto simples como está enquanto a conversão não passou —, então não
 * existe janela em que a tela quebra.
 *
 * ⚠️ Sem a ENCRYPTION_KEY não há como voltar atrás. Antes de rodar, garanta que
 * a chave está guardada em algum lugar que não seja só o .env desta máquina.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function encryptPasswords() {
  const entries = await prisma.passwordEntry.findMany({
    select: { id: true, name: true, password: true },
  });

  const pending = entries.filter((e) => !isEncrypted(e.password));

  for (const entry of pending) {
    await prisma.passwordEntry.update({
      where: { id: entry.id },
      data: { password: encrypt(entry.password) },
    });
    console.log(`  ✓ ${entry.name}`);
  }

  console.log(
    `senhas: ${pending.length} convertidas, ${entries.length - pending.length} já estavam cifradas`,
  );
}

async function encryptGoogleTokens() {
  const auth = await prisma.googleAuth.findFirst();

  if (!auth) {
    console.log("google: nenhuma conta conectada, nada a fazer");
    return;
  }

  if (isEncrypted(auth.accessToken) && isEncrypted(auth.refreshToken)) {
    console.log("google: tokens já estavam cifrados");
    return;
  }

  await prisma.googleAuth.update({
    where: { id: auth.id },
    data: {
      accessToken: isEncrypted(auth.accessToken)
        ? auth.accessToken
        : encrypt(auth.accessToken),
      refreshToken: isEncrypted(auth.refreshToken)
        ? auth.refreshToken
        : encrypt(auth.refreshToken),
    },
  });

  console.log(`google: tokens de ${auth.email ?? "conta conectada"} cifrados`);
}

async function main() {
  await encryptPasswords();
  await encryptGoogleTokens();
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
