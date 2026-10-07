"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { TeamMember } from "@/types/team";
import { useRemoveMember } from "@/hooks/use-team";
import { useAuthStore } from "@/lib/auth-store";
import { Modal } from "@/components/ui/modal";
import { ErrorState } from "@/components/ui/error-state";
import { jwtDecode } from "jwt-decode";
import { cn } from "@/lib/utils";

interface TeamMembersTableProps {
  members: TeamMember[];
}

const ROLE_STYLES: Record<string, string> = {
  owner: "border-transparent bg-primary/10 text-primary",
  admin: "border-transparent bg-violet/10 text-violet",
  agent: "border-transparent bg-success/10 text-success",
  viewer: "border-border text-muted-foreground",
};

export function TeamMembersTable({ members }: TeamMembersTableProps) {
  const { accessToken } = useAuthStore();
  const { mutate: removeMember, isPending, error } = useRemoveMember();
  const [memberToRemove, setMemberToRemove] = React.useState<TeamMember | null>(null);

  let currentUserId: string | null = null;
  if (accessToken) {
    try {
      const decoded: any = jwtDecode(accessToken);
      currentUserId = decoded.sub || decoded.user_id || null;
    } catch (e) {
      // ignore
    }
  }

  const confirmRemove = () => {
    if (!memberToRemove) return;
    const targetId = memberToRemove.id || (memberToRemove as any)._id || (memberToRemove as any).user_id;

    removeMember(targetId, {
      onSuccess: () => {
        setMemberToRemove(null);
      },
    });
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="hidden md:table-cell">Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const targetId = member.id || (member as any)._id || (member as any).user_id;
            const isSelf = currentUserId === targetId;

            return (
              <TableRow key={targetId} className="group">
                <TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    {member.username}
                    {isSelf && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        You
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn("capitalize", ROLE_STYLES[member.role.toLowerCase()] ?? ROLE_STYLES.viewer)}>
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                  {member.created_at
                    ? new Date(member.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <RoleGate allowedRoles={["owner"]}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMemberToRemove(member)}
                      disabled={isPending || isSelf}
                      aria-label="Remove member"
                      className="text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 disabled:opacity-30"
                      title={isSelf ? "You cannot remove yourself" : "Remove member"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </RoleGate>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Modal
        isOpen={!!memberToRemove}
        onClose={isPending ? () => {} : () => setMemberToRemove(null)}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${memberToRemove?.username} from the organization? They will lose all access immediately.`}
      >
        <div className="space-y-4">
          {error && <ErrorState variant="section" message="Failed to remove member. Please try again." />}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setMemberToRemove(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemove} disabled={isPending}>
              {isPending ? "Removing…" : "Remove Member"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}