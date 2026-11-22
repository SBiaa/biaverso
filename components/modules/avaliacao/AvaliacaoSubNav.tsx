import { SubNav, type SubNavLink } from "@/components/layout/SubNav";
import { PlanejarTabs } from "@/components/modules/planejar/PlanejarTabs";

const links: SubNavLink[] = [
  { href: "/avaliacao", label: "Visão geral" },
  { href: "/avaliacao/semana", label: "Semana" },
  { href: "/avaliacao/mes", label: "Mês" },
  { href: "/avaliacao/trimestre", label: "Trimestre" },
];

/** A barra de "Planejar" em cima; as abas da Avaliação logo abaixo. */
export function AvaliacaoSubNav() {
  return (
    <>
      <PlanejarTabs />
      <SubNav links={links} />
    </>
  );
}
