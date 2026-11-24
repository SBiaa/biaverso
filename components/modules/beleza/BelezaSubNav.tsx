import { SubNav, type SubNavLink } from "@/components/layout/SubNav";

const links: SubNavLink[] = [
  { href: "/beleza", label: "Hoje" },
  { href: "/beleza/rotinas", label: "Rotinas" },
  { href: "/beleza/cronogramas", label: "Cronogramas" },
  { href: "/beleza/cuidados", label: "Cuidados" },
  { href: "/beleza/produtos", label: "Produtos" },
];

export function BelezaSubNav() {
  return <SubNav links={links} />;
}
