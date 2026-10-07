"use client";
import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteProject } from "@/hooks/use-projects";

export function ConfirmDeleteDialog({
  isOpen,
  onClose,
  projectId,
  projectName,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}) {
  const [confirmText, setConfirmText] = React.useState("");
  const { mutate: deleteProject, isPending } = useDeleteProject();

  const handleDelete = () => {
    deleteProject(projectId, {
      onSuccess: () => {
        onClose();
        setConfirmText("");
      },
    });
  };

  const isConfirmed = confirmText === projectName;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isPending ? () => {} : onClose}
      title="Delete Project"
      description="This action cannot be undone. This will permanently delete the project and all related resources."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>
            Type <strong className="select-none font-mono text-foreground">{projectName}</strong> to confirm
          </Label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isPending}
            autoComplete="off"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={!isConfirmed || isPending} onClick={handleDelete}>
            {isPending ? "Deleting…" : "Delete Project"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}