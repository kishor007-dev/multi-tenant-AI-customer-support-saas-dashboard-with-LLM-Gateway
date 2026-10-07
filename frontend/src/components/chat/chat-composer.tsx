"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/ui/error-state";
import { SendHorizontal } from "lucide-react";

interface ChatComposerProps {
  onSend: (text: string) => void;
  isPending: boolean;
  error: any;
}

export function ChatComposer({ onSend, isPending, error }: ChatComposerProps) {
  const [text, setText] = React.useState("");

  const handleSend = () => {
    if (!text.trim() || isPending) return;
    onSend(text.trim());
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (error?.response?.status === 429) {
    return (
      <div className="border-t border-border bg-card p-4">
        <ErrorState variant="section" message="You're sending messages faster than allowed. Please wait a moment." />
      </div>
    );
  }

  if (error?.response?.status === 402) {
    return (
      <div className="border-t border-border bg-card p-4">
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm font-medium text-warning">This organization has used its monthly AI budget.</p>
          <Button variant="outline" size="sm" className="mt-3">
            Upgrade Plan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative border-t border-border bg-card p-4">
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Shift+Enter for new line)"
          className="min-h-[60px] resize-none bg-background pr-12"
          disabled={isPending}
        />
        <Button
          size="icon"
          className="absolute bottom-2 right-2 h-8 w-8 rounded-full"
          onClick={handleSend}
          disabled={!text.trim() || isPending}
        >
          <SendHorizontal className="h-4 w-4" />
          <span className="sr-only">Send Message</span>
        </Button>
      </div>
    </div>
  );
}