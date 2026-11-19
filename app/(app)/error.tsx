"use client";

import { ErrorScreen } from "@/components/layout/ErrorScreen";

// Mora dentro do grupo, e não só na raiz: o boundary substitui tudo abaixo do
// layout em que está. Na raiz ele levava junto a sidebar e a barra de baixo —
// justo quando a tela promete que "o resto do app continua funcionando".
// Aqui ele troca só o conteúdo, e a navegação continua à mão.
export default function AppError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen {...props} />;
}
