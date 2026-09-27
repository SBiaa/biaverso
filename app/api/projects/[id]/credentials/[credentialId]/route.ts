import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";

type Params = { params: Promise<{ id: string; credentialId: string }> };

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id, credentialId } = await params;

  // Desvincula do projeto. A senha continua no cofre — apagar de verdade só
  // pela tela de senhas, senão desfazer um clique aqui perderia a credencial.
  await prisma.projectCredential.delete({
    where: { id: credentialId, projectId: id },
  });

  return NextResponse.json({ ok: true });
});
