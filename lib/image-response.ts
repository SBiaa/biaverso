import { NextResponse } from "next/server";

/**
 * Data URL guardada no banco → resposta de imagem. As telas apontam o <img>
 * para a rota com `?v=<quando mudou>`, então o navegador guarda o arquivo e só
 * baixa de novo quando ele é trocado.
 */
export function dataUrlImageResponse(dataUrl: string | null | undefined) {
  const match = dataUrl ? /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(dataUrl) : null;
  if (!match) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
