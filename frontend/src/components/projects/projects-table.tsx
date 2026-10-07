"use client";

import * as React from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, ArrowRight } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { ProjectOut } from "@/types/project";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

export function ProjectsTable({ projects }: { projects: ProjectOut[] }) {
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState<ProjectOut | null>(null);

  const openDelete = (project: ProjectOut) => {
    setSelectedProject(project);
    setDeleteModalOpen(true);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} className="group/row">
              <TableCell className="py-3">
                <Link
                  href={`/projects/${project.id}/knowledge-base`}
                  className="group inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-1.5 text-sm font-semibold text-foreground transition-all duration-200 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 active:scale-[0.98]"
                >
                  <span>{project.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-violet-600 dark:group-hover:text-violet-400" />
                </Link>
              </TableCell>
              <TableCell className="hidden max-w-[200px] truncate text-muted-foreground md:table-cell">
                {project.description || "—"}
              </TableCell>
              <TableCell>
                <Badge variant={project.status === "active" ? "signal" : "default"}>
                  {project.status || "active"}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {new Date(project.created_at).toLocaleDateString("en-IN")}
              </TableCell>
              <TableCell className="text-right">
                <RoleGate allowedRoles={["owner", "admin"]}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDelete(project)}
                    aria-label="Delete project"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </RoleGate>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedProject && (
        <ConfirmDeleteDialog
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
        />
      )}
    </>
  );
}
