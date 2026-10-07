"use client";
import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClearKB } from "@/hooks/use-kb";
import { ErrorState } from "@/components/ui/error-state";
interface ConfirmClearKBDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string; 
}
export function ConfirmClearKBDialog({ isOpen, onClose, projectId }: ConfirmClearKBDialogProps) {
  const [confirmText, setConfirmText] = React.useState("");
  const { mutate: clearKB, isPending, error } = useClearKB(projectId);
 const handleClear = () => {
clearKB(undefined, {
onSuccess: () => {
setConfirmText("");
onClose();
},
});
};
const isConfirmed = confirmText === "DELETE ALL";
return (
<Modal
isOpen={isOpen}
onClose={isPending ? () => {} : onClose}
title="Clear Knowledge Base"
description="This action cannot be undone. This will permanently
wipe the entire organization's knowledge base."
>
<div className="space-y-4">
{error && (
<ErrorState variant="section" message="Failed to clear
knowledge base. Please try again." />
)}
<div className="space-y-2">
<Label>
Type <strong className="select-none font-mono
text-destructive">DELETE ALL</strong> to confirm
</Label>
<Input
value={confirmText}
onChange={(e) => setConfirmText(e.target.value)}
disabled={isPending}
autoComplete="off"
className="font-mono"
/>
</div>
<div className="flex justify-end space-x-2 pt-4">
<Button type="button" variant="outline" onClick={onClose}
disabled={isPending}>
Cancel
</Button>
<Button
type="button"
variant="destructive"
disabled={!isConfirmed || isPending}
onClick={handleClear} >
{isPending ? "Wiping..." : "Clear Knowledge Base"}
</Button>
</div>
</div>
</Modal>
);
}
