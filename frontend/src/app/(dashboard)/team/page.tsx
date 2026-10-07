"use client";

import * as React from "react";
import { useTeam } from "@/hooks/use-team";
import { TeamMembersTable } from "@/components/team/team-members-table";
import { InviteMemberModal } from "@/components/team/invite-member-modal";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { RoleGate } from "@/components/auth/role-gate";
import { Users, UserPlus } from "lucide-react";

export default function TeamPage() {
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const { data: members, isLoading, isError, refetch } = useTeam();

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Team Management</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Manage your organization members, assign roles, and generate secure invitation tokens.
          </p>
        </div>

        <RoleGate allowedRoles={["owner", "admin"]}>
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite Member
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
            message="Couldn't load team members. Please ensure you have permission."
            action={
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : !members || members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No team members found"
            description="Your organization doesn't have any members listed."
          />
        ) : (
          <TeamMembersTable members={members} />
        )}
      </div>

      <InviteMemberModal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
    </div>
  );
}