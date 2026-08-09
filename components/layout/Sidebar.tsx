"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBusinessIcon } from "@/lib/business-visuals";
import { navGroups, type NavItem } from "./nav-config";

type Business = { id: string; name: string; icon: string | null };

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-accent/10 text-accent"
          : "text-text-primary hover:bg-black/[0.03]",
      )}
    >
      <Icon size={16} />
      {item.label}
    </Link>
  );
}

export function Sidebar({ businesses }: { businesses: Business[] }) {
  const pathname = usePathname();

  function isItemActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <aside className="hidden w-[200px] shrink-0 flex-col gap-6 border-r border-border bg-surface px-3 py-6 md:flex">
      <span className="px-3 text-lg font-semibold text-text-primary">
        biaVerso
      </span>

      <nav className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span className="px-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
            {navGroups[0].title}
          </span>
          {navGroups[0].items.map((item) => (
            <NavLink key={item.href} item={item} isActive={isItemActive(item.href)} />
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <span className="px-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
            Negócios
          </span>
          <NavLink
            item={{ href: "/negocios", label: "Todos os negócios", icon: Building2 }}
            isActive={pathname === "/negocios"}
          />
          {businesses.map((business) => (
            <NavLink
              key={business.id}
              item={{
                href: `/negocios/${business.id}`,
                label: business.name,
                icon: getBusinessIcon(business.icon),
              }}
              isActive={isItemActive(`/negocios/${business.id}`)}
            />
          ))}
        </div>

        {navGroups.slice(1).map((group) => (
          <div key={group.title} className="flex flex-col gap-1">
            <span className="px-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
              {group.title}
            </span>
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} isActive={isItemActive(item.href)} />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
