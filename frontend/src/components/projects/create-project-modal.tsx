"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateProject } from "@/hooks/use-projects";
import { ErrorState } from "@/components/ui/error-state";

const schema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Name too long"),

  description: z
    .string()
    .max(500, "Description too long")
    .optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
}: CreateProjectModalProps) {
  const { mutate: createProject, isPending } = useCreateProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    createProject(data, {
      onSuccess: () => {
        onClose();
        reset();
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isPending ? () => {} : onClose}
      title="New Project"
      description="Create a new workspace project."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>

          <Input
            id="name"
            {...register("name")}
            placeholder="Internal Tools"
            disabled={isPending}
          />

          {errors.name && (
            <ErrorState
              variant="field"
              message={errors.name.message as string}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>

          <Textarea
            id="description"
            {...register("description")}
            placeholder="Purpose of this project..."
            disabled={isPending}
          />

          {errors.description && (
            <ErrorState
              variant="field"
              message={errors.description.message as string}
            />
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}