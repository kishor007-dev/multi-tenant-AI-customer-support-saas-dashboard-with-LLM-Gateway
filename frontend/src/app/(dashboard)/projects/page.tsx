"use client";

import * as React from "react";
import { useProjects } from "@/hooks/use-projects";
import { ProjectsTable } from "@/components/projects/projects-table";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { RoleGate } from "@/components/auth/role-gate";
import { Folder, Plus } from "lucide-react";

export default function ProjectsPage() {
  const [limit] = React.useState(20);
  const [skip, setSkip] = React.useState(0);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);

  const { data: projects, isLoading, isError, refetch } = useProjects(limit, skip);

  const hasMorePages = projects ? projects.length === limit : false;
  const derivedTotal = projects ? (hasMorePages ? skip + limit + 1 : skip + projects.length) : 0;

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your organization's projects and members.</p>
        </div>
        <RoleGate allowedRoles={["owner", "admin"]}>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </RoleGate>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-3">
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
          </div>
        ) : isError ? (
          <ErrorState
            variant="page"
            message="Couldn't load projects. Please try again."
            action={
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : !projects || projects.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="No projects found"
            description="Your organization doesn't have any projects yet."
            action={
              <RoleGate allowedRoles={["owner", "admin"]}>
                <Button onClick={() => setCreateModalOpen(true)}>Create your first project</Button>
              </RoleGate>
            }
          />
        ) : (
          <div className="flex h-full flex-col gap-4">
            <ProjectsTable projects={projects} />
            <Pagination variant="limit_skip" total={derivedTotal} limit={limit} skip={skip} onSkipChange={setSkip} />
          </div>
        )}
      </div>

      <CreateProjectModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </div>
  );
}