"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { formatDateBR } from "@/lib/utils";
import { projectStatusLabels, contentStatusLabels, productionStatusLabels } from "@/lib/labels";
import { ProjectFormModal } from "@/components/modules/negocios/ProjectFormModal";
import { ContentPostModal, type ClientOption, type ProjectOption, type PostRecord } from "./ContentPostModal";
import { ProductionTaskModal, type TaskRecord } from "./ProductionTaskModal";

export type ProjectWithItems = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  posts: PostRecord[];
  tasks: TaskRecord[];
};

export function ClientProjectsSection({
  businessId,
  clientId,
  projects,
  clients,
  projectOptions,
}: {
  businessId: string;
  clientId: string;
  projects: ProjectWithItems[];
  clients: ClientOption[];
  projectOptions: ProjectOption[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(projects[0]?.id ?? null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [creatingFor, setCreatingFor] = useState<{ projectId: string; kind: "post" | "task" } | null>(
    null,
  );
  const [editingPost, setEditingPost] = useState<PostRecord | null>(null);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Projetos</h2>
        <Button variant="secondary" onClick={() => setCreatingProject(true)}>
          <Plus size={14} />
          Novo projeto
        </Button>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum projeto cadastrado ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((project) => {
            const expanded = expandedId === project.id;
            return (
              <Card key={project.id} className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : project.id)}
                  className="flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    {expanded ? (
                      <ChevronDown size={16} className="text-text-secondary" />
                    ) : (
                      <ChevronRight size={16} className="text-text-secondary" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{project.name}</p>
                      {project.description && (
                        <p className="text-xs text-text-secondary">{project.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-text-secondary">
                    {projectStatusLabels[project.status]}
                  </span>
                </button>

                {expanded && (
                  <div className="flex flex-col gap-3 border-t border-border pt-3">
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-text-secondary">
                        Posts do cronograma
                      </p>
                      {project.posts.length === 0 ? (
                        <p className="text-xs text-text-secondary">Nenhum post vinculado.</p>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {project.posts.map((post) => (
                            <li key={post.id}>
                              <button
                                type="button"
                                onClick={() => setEditingPost(post)}
                                className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-black/[0.02]"
                              >
                                <span className="text-text-primary">{post.title}</span>
                                <span className="flex items-center gap-2 text-xs text-text-secondary">
                                  {contentStatusLabels[post.status]}
                                  {post.publishDate && (
                                    <span>{formatDateBR(new Date(post.publishDate))}</span>
                                  )}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => setCreatingFor({ projectId: project.id, kind: "post" })}
                        className="mt-1 text-xs"
                      >
                        <Plus size={12} />
                        Adicionar post
                      </Button>
                    </div>

                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-text-secondary">
                        Tarefas de produção
                      </p>
                      {project.tasks.length === 0 ? (
                        <p className="text-xs text-text-secondary">Nenhuma tarefa vinculada.</p>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {project.tasks.map((task) => (
                            <li key={task.id}>
                              <button
                                type="button"
                                onClick={() => setEditingTask(task)}
                                className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-black/[0.02]"
                              >
                                <span className="text-text-primary">{task.title}</span>
                                <span className="flex items-center gap-2 text-xs text-text-secondary">
                                  {productionStatusLabels[task.status]}
                                  {task.dueDate && (
                                    <span>{formatDateBR(new Date(task.dueDate))}</span>
                                  )}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => setCreatingFor({ projectId: project.id, kind: "task" })}
                        className="mt-1 text-xs"
                      >
                        <Plus size={12} />
                        Adicionar tarefa
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {creatingProject && (
        <ProjectFormModal
          businessId={businessId}
          clientId={clientId}
          onClose={() => setCreatingProject(false)}
        />
      )}
      {creatingFor?.kind === "post" && (
        <ContentPostModal
          businessId={businessId}
          clients={clients}
          projects={projectOptions}
          defaultClientId={clientId}
          defaultProjectId={creatingFor.projectId}
          onClose={() => setCreatingFor(null)}
        />
      )}
      {creatingFor?.kind === "task" && (
        <ProductionTaskModal
          businessId={businessId}
          clients={clients}
          projects={projectOptions}
          defaultClientId={clientId}
          defaultProjectId={creatingFor.projectId}
          onClose={() => setCreatingFor(null)}
        />
      )}
      {editingPost && (
        <ContentPostModal
          businessId={businessId}
          clients={clients}
          projects={projectOptions}
          post={editingPost}
          onClose={() => setEditingPost(null)}
        />
      )}
      {editingTask && (
        <ProductionTaskModal
          businessId={businessId}
          clients={clients}
          projects={projectOptions}
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
