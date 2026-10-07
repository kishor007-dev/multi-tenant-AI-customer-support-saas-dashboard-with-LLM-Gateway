"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/ui/error-state";
import { useEscalateConversation } from "@/hooks/use-chat";

export function EscalateDialog({
  isOpen,
  onClose,
  conversationId,
}: {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
}) {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [priority, setPriority] = React.useState<"low" | "medium" | "high">("medium");
  const [reason, setReason] = React.useState("");

  const { mutate: escalate, isPending, isError } = useEscalateConversation(projectId);

  const handleEscalate = () => {
    escalate(
      { id: conversationId, data: { priority, reason } },
      {
        onSuccess: () => {
          onClose();
          router.push(`/projects/${projectId}/tickets`);
        },
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isPending ? () => {} : onClose}
      title="Hand off to human"
      description="An agent will be notified to assist with this conversation."
    >
      <div className="space-y-4">
        {isError && (
          <ErrorState
            variant="section"
            message="Escalation couldn't be completed right now — your message is still saved. Try again shortly."
          />
        )}
        <div className="space-y-2">
          <Label>Priority</Label>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as const).map((p) => (
              <Button
                key={p}
                type="button"
                variant={priority === p ? "default" : "outline"}
                onClick={() => setPriority(p)}
                className="flex-1 capitalize"
                disabled={isPending}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason (optional)</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this being escalated?"
            disabled={isPending}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleEscalate} disabled={isPending}>
            {isPending ? "Escalating…" : "Confirm Handoff"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}