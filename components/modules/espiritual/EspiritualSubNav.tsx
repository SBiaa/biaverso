import { SubNav, type SubNavLink } from "@/components/layout/SubNav";

const links: SubNavLink[] = [
  { href: "/espiritual", label: "Hoje" },
  { href: "/espiritual/roda", label: "Roda do ano" },
  { href: "/espiritual/coven", label: "Coven" },
  { href: "/espiritual/estudos", label: "Textos e exercícios" },
  { href: "/espiritual/rituais", label: "Diário" },
  { href: "/espiritual/tiragens", label: "Tiragens" },
  { href: "/espiritual/altar", label: "Altar" },
];

export function EspiritualSubNav() {
  return <SubNav links={links} />;
}
