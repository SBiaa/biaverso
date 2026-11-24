"use client";

const SIZE = 256;

/**
 * Lê a imagem escolhida, recorta o centro em quadrado e reduz para 256px em
 * JPEG. Fica em ~15–30 KB, pequeno o bastante pra morar numa coluna do banco.
 */
export async function resizeClientPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Não consegui abrir essa imagem.");
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não consegui processar a imagem.");

  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE,
  );
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

const COVER_WIDTH = 1600;
const COVER_HEIGHT = 400;

/**
 * Capa do negócio: recorta a faixa do meio na proporção 4:1 (a da capa do
 * Notion) e reduz para 1600x400 em JPEG, ~100–200 KB.
 */
export async function resizeCover(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Não consegui abrir essa imagem.");
  }

  const ratio = COVER_WIDTH / COVER_HEIGHT;
  // A maior faixa 4:1 que cabe na foto, centralizada.
  const width = Math.min(bitmap.width, bitmap.height * ratio);
  const height = width / ratio;
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(COVER_WIDTH, Math.round(width));
  canvas.height = Math.round(canvas.width / ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não consegui processar a imagem.");

  ctx.drawImage(
    bitmap,
    (bitmap.width - width) / 2,
    (bitmap.height - height) / 2,
    width,
    height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

const POST_COVER_WIDTH = 1080;
const POST_COVER_HEIGHT = 1350;

/**
 * Capa do post no Feed: recorta o centro em 4:5 (o formato do feed) e reduz
 * para 1080x1350 em JPEG, ~200–400 KB. O grid do perfil corta o meio em 3:4
 * na hora de mostrar, como o Instagram faz.
 */
export async function resizePostCover(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Não consegui abrir essa imagem.");
  }

  const ratio = POST_COVER_WIDTH / POST_COVER_HEIGHT;
  // O maior retângulo 4:5 que cabe na imagem, centralizado.
  const width = Math.min(bitmap.width, bitmap.height * ratio);
  const height = width / ratio;
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(POST_COVER_WIDTH, Math.round(width));
  canvas.height = Math.round(canvas.width / ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não consegui processar a imagem.");

  ctx.drawImage(
    bitmap,
    (bitmap.width - width) / 2,
    (bitmap.height - height) / 2,
    width,
    height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}
