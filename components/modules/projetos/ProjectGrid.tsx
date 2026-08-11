"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui";
import { cn, formatDateBR, hexToRgba } from "@/lib/utils";
import { projectStatusLabels } from "@/lib/labels";
import {
  projectStatusColors,
  sortProjectCards,
  type ProjectCard,
  type ProjectSort,
} from "@/lib/projects-shared";

/**
 * Grid de projetos agrupado por negócio. Usado na página global /projetos e na
 * aba Projetos do negócio — na aba os cards já vêm filtrados, então o
 * agrupamento vira um grupo só e o cabeçalho some.
 */
export function ProjectGrid({
  projects,
  sort,
  showBusinessGroups = true,
}: {
  projects: ProjectCard[];
  sort: ProjectSort;
  showBusinessGroups?: boolean;
}) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Nenhum projeto encontrado com esses filtros.
      </p>
    );
  }

  const sorted = sortProjectCards(projects, sort);

  // Preserva a ordem de aparição para os grupos não pularem de lugar a cada
  // troca de ordenação.
  const groups: { businessId: string; name: string; color: string; items: ProjectCard[] }[] = [];
  const byId = new Map<string, (typeof groups)[number]>();

  for (const project of sorted) {
    const key = showBusinessGroups ? project.businessId : "all";
    let group = byId.get(key);
    if (!group) {
      group = {
        businessId: key,
        name: project.businessName,
        color: project.businessColor,
        items: [],
      };
      byId.set(key, group);
      groups.push(group);
    }
    group.items.push(project);
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.businessId} className="flex flex-col gap-2">
          {showBusinessGroups && (
            <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              {group.name}
            </h3>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((project) => {
              const statusColor = projectStatusColors[project.status] ?? "#6B7280";
              return (
                <Link
                  key={project.id}
                  href={`/negocios/${project.businessId}/projetos/${project.id}`}
                  className="block transition-colors hover:bg-black/[0.02]"
                >
                  <Card className="flex h-full flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-text-primary">
                        {project.name}
                      </p>
                      <span
                        className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: hexToRgba(statusColor, 0.12),
                          color: statusColor,
                        }}
                      >
                        {projectStatusLabels[project.status] ?? project.status}
                      </span>
                    </div>

                    <p className="text-xs text-text-secondary">
                      {project.isInternal || !project.clientName
                        ? "Projeto interno"
                        : project.clientName}
                    </p>

                    <div className="mt-auto flex flex-col gap-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-text-secondary">
                        <span>
                          {project.doneItems}/{project.totalItems} concluídas
                        </span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>

                      {project.nextDeadline && (
                        <span
                          className={cn(
                            "flex items-center gap-1 text-[11px]",
                            project.overdue
                              ? "font-medium text-red-600"
                              : "text-text-secondary",
                          )}
                        >
                          {project.overdue ? (
                            <AlertTriangle size={12} />
                          ) : (
                            <CalendarClock size={12} />
                          )}
                          {project.overdue ? "Atrasado desde " : "Próximo prazo: "}
                          {formatDateBR(new Date(project.nextDeadline))}
                        </span>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
