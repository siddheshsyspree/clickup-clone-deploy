"use client";

import { useState } from "react";
import { format } from "date-fns";
import { SmilePlus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatAttachment } from "@/components/chat/chat-attachment";
import { addReaction, removeReaction, type Message } from "@/lib/queries/chat";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const QUICK_EMOJIS = ["👍", "🎉", "❤️", "😂", "👀"];

export function MessageItem({ message, channelId }: { message: Message; channelId: string }) {
  const [showPicker, setShowPicker] = useState(false);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const mine = message.authorId === currentUserId;

  const reactMutation = useMutation({
    mutationFn: ({ emoji, mineReaction }: { emoji: string; mineReaction: boolean }) =>
      mineReaction ? removeReaction(message.id, emoji) : addReaction(message.id, emoji),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", channelId] }),
  });

  const grouped = message.reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className={cn("group flex items-end gap-2 px-2 py-1", mine && "flex-row-reverse")}>
      {!mine && (
        <Avatar className="mb-0.5 h-7 w-7 shrink-0">
          <AvatarImage src={message.author.avatarUrl ?? undefined} />
          <AvatarFallback className="text-xs">{message.author.name[0]}</AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex max-w-[75%] flex-col", mine ? "items-end" : "items-start")}>
        {!mine && <span className="mb-0.5 px-1 text-xs font-medium text-muted-foreground">{message.author.name}</span>}

        <div
          className={cn(
            "space-y-1.5 rounded-2xl px-3 py-2 text-sm",
            mine
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md border border-border bg-muted/60 text-foreground",
          )}
        >
          {message.isDeleted ? (
            <em className={cn(mine ? "text-primary-foreground/70" : "text-muted-foreground")}>Message deleted</em>
          ) : (
            <>
              {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
              {message.attachments.map((a) => (
                <ChatAttachment key={a.id} attachment={a} mine={mine} />
              ))}
            </>
          )}
        </div>

        <div className={cn("mt-0.5 flex items-center gap-1.5 px-1", mine && "flex-row-reverse")}>
          <span className="text-[11px] text-muted-foreground">{format(new Date(message.createdAt), "h:mm a")}</span>
          <div className="relative opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={() => setShowPicker((v) => !v)} className="rounded p-0.5 text-muted-foreground hover:bg-accent">
              <SmilePlus className="h-3.5 w-3.5" />
            </button>
            {showPicker && (
              <div className={cn("absolute top-6 z-10 flex gap-1 rounded-lg border border-border bg-popover p-1 shadow-soft-lg", mine ? "right-0" : "left-0")}>
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      reactMutation.mutate({ emoji, mineReaction: false });
                      setShowPicker(false);
                    }}
                    className="rounded p-1 text-sm hover:bg-accent"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {!!Object.keys(grouped).length && (
          <div className={cn("flex flex-wrap gap-1 px-1", mine && "justify-end")}>
            {Object.entries(grouped).map(([emoji, count]) => {
              const mineReaction = message.reactions.some((r) => r.emoji === emoji && r.userId === currentUserId);
              return (
                <button
                  key={emoji}
                  onClick={() => reactMutation.mutate({ emoji, mineReaction })}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs",
                    mineReaction ? "border-primary bg-primary/10" : "border-border bg-muted/50",
                  )}
                >
                  {emoji} {count}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
