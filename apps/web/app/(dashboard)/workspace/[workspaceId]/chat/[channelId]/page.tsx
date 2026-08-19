"use client";

import { use, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Hash, Lock, Paperclip, Send, SmilePlus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageItem } from "@/components/chat/message-item";
import { Skeleton } from "@/components/ui/skeleton";
import { listChannels, listMessages, sendMessage, uploadChatAttachment, type MessageAttachment } from "@/lib/queries/chat";
import { listNotifications, markNotificationRead } from "@/lib/queries/notifications";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-client";

type PendingAttachment = Omit<MessageAttachment, "id"> & { tempId: string };

const COMPOSER_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "😢", "🙏", "🔥", "👀", "✅"];

export default function ChannelPage({ params }: { params: Promise<{ workspaceId: string; channelId: string }> }) {
  const { workspaceId, channelId } = use(params);
  const [content, setContent] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Shares the sidebar's cached list rather than adding a per-channel endpoint —
  // this is the only place that needs to know the channel's own name/type/members.
  const { data: channels } = useQuery({ queryKey: ["channels", workspaceId], queryFn: () => listChannels(workspaceId) });
  const channel = channels?.find((c) => c.id === channelId);
  const dmPartner = channel?.type === "DM" ? channel.members.find((m) => m.userId !== currentUserId)?.user : undefined;

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", channelId],
    queryFn: () => listMessages(channelId),
  });

  // Shares the bell's own cache — opening a conversation should clear every
  // unread notification for it, not just the one you happened to click to
  // get here (you might have arrived via the sidebar instead of the bell).
  const { data: notifications } = useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications() });
  useEffect(() => {
    const unread = notifications?.filter((n) => !n.isRead && n.entityType === "Channel" && n.entityId === channelId);
    if (!unread?.length) return;
    Promise.all(unread.map((n) => markNotificationRead(n.id))).then(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
  }, [channelId, notifications, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  // The API broadcasts new messages to this channel's own socket room (rather than
  // the whole workspace, unlike tasks/activity) — so whoever has it open needs to
  // actually be in that room, or the live update never arrives.
  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);
    const join = () => socket.emit("join:channel", channelId);
    if (socket.connected) join();
    socket.on("connect", join);
    return () => {
      socket.emit("leave:channel", channelId);
      socket.off("connect", join);
    };
  }, [accessToken, channelId]);

  const mutation = useMutation({
    mutationFn: () =>
      sendMessage(channelId, {
        content,
        attachments: pendingAttachments.map(({ tempId: _tempId, ...a }) => a),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
      setContent("");
      setPendingAttachments([]);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Message failed to send"),
  });

  function submit() {
    if (!content.trim() && !pendingAttachments.length) return;
    mutation.mutate();
  }

  async function handleFilePick(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      // Sequential, not Promise.all — parallel multipart uploads through the
      // production proxy are far likelier to be throttled or truncated.
      for (const file of files) {
        const uploaded = await uploadChatAttachment(channelId, file);
        setPendingAttachments((prev) => [...prev, { ...uploaded, tempId: crypto.randomUUID() }]);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removePending(tempId: string) {
    setPendingAttachments((prev) => prev.filter((a) => a.tempId !== tempId));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {channel && (
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          {dmPartner ? (
            <>
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={dmPartner.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">{dmPartner.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold">{dmPartner.name}</span>
            </>
          ) : (
            <>
              {channel.type === "PRIVATE" ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Hash className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold">{channel.name}</span>
            </>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {!isLoading && !messages?.length && (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello 👋</p>
        )}
        {messages?.map((message) => (
          <MessageItem key={message.id} message={message} channelId={channelId} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3">
        <div className="rounded-2xl border border-border bg-card shadow-soft">
          {!!pendingAttachments.length && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-3">
              {pendingAttachments.map((a) => (
                <span key={a.tempId} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 py-1 pl-2 pr-1 text-xs">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="max-w-[10rem] truncate">{a.fileName}</span>
                  <button onClick={() => removePending(a.tempId)} className="rounded p-0.5 text-muted-foreground hover:bg-accent" aria-label={`Remove ${a.fileName}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={dmPartner ? `Message ${dmPartner.name}…` : channel ? `Message #${channel.name}…` : "Message…"}
            rows={1}
            className="w-full resize-none bg-transparent px-3.5 pb-1 pt-3 text-sm outline-none placeholder:text-muted-foreground"
          />

          <div className="flex items-center gap-0.5 px-2 pb-2 pt-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFilePick(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-muted-foreground"
                onClick={() => setShowEmojiPicker((v) => !v)}
                aria-label="Add emoji"
              >
                <SmilePlus className="h-4 w-4" />
              </Button>
              {showEmojiPicker && (
                <div className="absolute bottom-9 left-0 z-10 flex flex-wrap gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-soft-lg" style={{ width: "13rem" }}>
                  {COMPOSER_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setContent((c) => c + emoji);
                        setShowEmojiPicker(false);
                        textareaRef.current?.focus();
                      }}
                      className="rounded p-1 text-lg hover:bg-accent"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1" />

            <Button
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={submit}
              disabled={(!content.trim() && !pendingAttachments.length) || mutation.isPending || uploading}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
