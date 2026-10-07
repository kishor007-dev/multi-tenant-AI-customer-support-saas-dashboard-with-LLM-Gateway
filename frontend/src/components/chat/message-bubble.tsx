import * as React from "react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/types/chat";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Bot, Headset } from "lucide-react";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isAgent = message.is_human_agent;

  const textContent = message.content || (message as any).text || (message as any).message || "";
  const timeStamp = message.created_at || (message as any).createdAt;

  return (
    <div className={cn("mb-6 flex w-full gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="mt-1 h-8 w-8 shrink-0">
          <AvatarFallback className={cn(isAgent ? "bg-muted text-foreground" : "bg-primary/10 text-primary")}>
            {isAgent ? <Headset className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex max-w-[80%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "whitespace-pre-wrap px-4 py-2 text-sm shadow-soft",
            isUser
              ? "rounded-2xl rounded-br-none bg-primary text-primary-foreground"
              : "rounded-2xl rounded-bl-none border border-border bg-card text-foreground",
            isAgent && "bg-muted/50"
          )}
        >
          {textContent}
        </div>

        {timeStamp && (
          <span className="px-1 font-mono text-[10px] text-muted-foreground">
            {new Date(timeStamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {isUser && (
        <Avatar className="mt-1 h-8 w-8 shrink-0">
          <AvatarFallback className="bg-muted text-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}