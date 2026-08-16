import { SubNav, type SubNavLink } from "@/components/layout/SubNav";

const links: SubNavLink[] = [
  { href: "/avaliacao", label: "Visão geral" },
  { href: "/avaliacao/semana", label: "Semana" },
  { href: "/avaliacao/mes", label: "Mês" },
  { href: "/avaliacao/trimestre", label: "Trimestre" },
];

export function AvaliacaoSubNav() {
  return <SubNav links={links} />;
}
