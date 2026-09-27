import { SubNav, type SubNavLink } from "@/components/layout/SubNav";

const links: SubNavLink[] = [
  { href: "/financeiro", label: "Visão geral" },
  { href: "/financeiro/planejamento", label: "Planejamento" },
  { href: "/financeiro/transacoes", label: "Transações" },
  { href: "/financeiro/contas-fixas", label: "Contas fixas" },
  { href: "/financeiro/cartao", label: "Cartão" },
  { href: "/financeiro/dividas", label: "Dívidas" },
  { href: "/financeiro/investimentos", label: "Investimentos" },
];

export function FinanceSubNav() {
  return <SubNav links={links} />;
}
