"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ProjectCard } from "./ProjectCard";
import { ProjectFormModal } from "./ProjectFormModal";

type TaskItem = { id: string; title: string; done: boolean; dueDate: string | null };
type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  tasks: TaskItem[];
};

export function ProjectList({
  businessId,
  projects,
}: {
  businessId: string;
  projects: Project[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => setCreating(true)}>+ Novo projeto</Button>

      {projects.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Nenhum projeto cadastrado ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {creating && (
        <ProjectFormModal businessId={businessId} onClose={() => setCreating(false)} />
      )}
    </div>
  );
}
