import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, route } from "@/lib/api";
import { projectHref } from "@/lib/projects-shared";

type Params = { params: Promise<{ id: string }> };

/**
 * "Virou projeto" de verdade: cria o projeto no negócio da ideia, já com o
 * título e a descrição dela, e deixa os dois ligados. Antes "Virou projeto"
 * era só uma etiqueta — o projeto tinha que ser criado à mão em outra tela e
 * nada lembrava de onde ele tinha vindo.
 */
export const POST = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const idea = await prisma.idea.findUniqueOrThrow({ where: { id } });

  if (idea.projectId) throw new ApiError(409, "Esta ideia já virou um projeto.");
  // Projeto sempre mora num negócio; ideia pessoal não tem onde nascer.
  if (!idea.businessId) {
    throw new ApiError(400, "Escolha um negócio para a ideia antes de transformá-la em projeto.");
  }

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        name: idea.title,
        description: idea.description,
        businessId: idea.businessId!,
        // Sem cliente: começa como projeto interno do negócio, como no
        // cadastro normal. O cliente pode ser escolhido depois no projeto.
        isInternal: true,
      },
    });
    await tx.idea.update({
      where: { id },
      data: { projectId: created.id, status: "VIROU_PROJETO" },
    });
    return created;
  });

  return NextResponse.json({
    projectId: project.id,
    href: projectHref(project.businessId, project.id),
  });
});
