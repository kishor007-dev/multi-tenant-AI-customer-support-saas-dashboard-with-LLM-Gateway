import * as React from "react";
import { MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function ChatIndexPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={MessageSquare}
        title="Select a conversation"
        description="Choose a conversation from the sidebar or start a new one."
      />
    </div>
  );
}
