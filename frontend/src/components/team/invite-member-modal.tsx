"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/ui/error-state";
import { useInviteMember } from "@/hooks/use-team";
import { CopyableTokenCard } from "./copyable-token-card";
import { MemberRole, InviteResponse } from "@/types/team";
import { useAuthStore } from "@/lib/auth-store";
import { jwtDecode } from "jwt-decode";

const schema = z.object({
  role: z.enum(["owner", "admin", "agent", "viewer"]),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username too long")
    .optional()
    .or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
  const { accessToken } = useAuthStore();
  const { mutate: inviteMember, isPending, error } = useInviteMember();
  const [inviteResult, setInviteResult] = React.useState<InviteResponse | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "agent",
      username: "",
    },
  });

  const onSubmit = (data: FormData) => {
    const payload = {
      role: data.role as MemberRole,
      username: data.username ? data.username : undefined,
    };

    inviteMember(payload, {
      onSuccess: (response) => {
        setInviteResult(response);
      },
    });
  };

  const handleClose = () => {
    if (isPending) return;
    setInviteResult(null);
    reset();
    onClose();
  };

  let currentUserRole = "viewer";
  if (accessToken) {
    try {
      const decoded: any = jwtDecode(accessToken);
      currentUserRole = decoded.role;
    } catch (e) {}
  }

  const availableRoles: MemberRole[] =
    currentUserRole === "owner" ? ["owner", "admin", "agent", "viewer"] : ["admin", "agent", "viewer"];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Team Member"
      description="Generate a secure, one-time invitation token for a new user."
    >
      {inviteResult ? (
        <div className="space-y-6">
          <CopyableTokenCard token={inviteResult.invite_token} />
          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && <ErrorState variant="section" message="Failed to generate invitation. Please check permissions." />}

          <div className="space-y-2">
            <Label htmlFor="role">Role Allocation</Label>
            <select
              id="role"
              {...register("role")}
              className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background px-3.5 py-2 text-sm shadow-sm transition-colors focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending}
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            {errors.role && <ErrorState variant="field" message={errors.role.message as string} />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">
              Pre-assigned Username <span className="font-normal text-muted-foreground">(Optional)</span>
            </Label>
            <Input id="username" {...register("username")} placeholder="e.g. johndoe" disabled={isPending} />
            {errors.username && <ErrorState variant="field" message={errors.username.message as string} />}
            <p className="text-xs text-muted-foreground">
              If specified, only this exact username can claim the invitation.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Generating…" : "Generate Invite"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}