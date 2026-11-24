import type { MetadataRoute } from "next";
import { normalizeAccent } from "@/lib/accent";
import { getUserSettings } from "@/lib/settings";

// Dinâmico (não os campos estáticos de nome/ícone, só a cor) pelo mesmo motivo
// do layout: ler a cor de acento salva e devolver no manifest, sem precisar
// duplicar o valor à mão se ela for trocada em /configuracoes.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { accentColor } = await getUserSettings();

  return {
    name: "biaVerso",
    short_name: "biaVerso",
    description: "Central de gestão pessoal — rotina, finanças e negócios",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: normalizeAccent(accentColor),
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
