"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth-store";
import type { TaskSummary } from "@/lib/queries/tasks";
import type { Notification } from "@/lib/queries/notifications";

export function useSocketSync(workspaceId: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    function joinWorkspace() {
      socket.emit("join:workspace", workspaceId);
    }
    if (socket.connected) joinWorkspace();
    socket.on("connect", joinWorkspace);

    const onTaskChange = (task: TaskSummary) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", task.projectId] });
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", workspaceId] });
    };
    const onTaskDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    };
    const onNotification = (n: Notification) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", workspaceId] });
      // Only chat notifications carry enough info (workspace + channel) to jump
      // straight to the conversation without an extra lookup — other entity
      // types just mark read for now.
      const chatHref = n.entityType === "Channel" && n.workspaceId ? `/workspace/${n.workspaceId}/chat/${n.entityId}` : null;
      toast(n.title, chatHref ? { action: { label: "View", onClick: () => router.push(chatHref) } } : undefined);
    };
    const onCommentChange = (comment: { taskId?: string }) => {
      if (comment?.taskId) queryClient.invalidateQueries({ queryKey: ["task", comment.taskId] });
    };
    const onActivity = () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    };
    const onMessage = (message: { channelId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", message.channelId] });
      queryClient.invalidateQueries({ queryKey: ["channels", workspaceId] });
    };
    const onPresence = () => {
      queryClient.invalidateQueries({ queryKey: ["presence"] });
    };
    const onFileChange = () => {
      queryClient.invalidateQueries({ queryKey: ["files", workspaceId] });
    };
    const onWhatsAppMessage = (message: { taskId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", message.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task", message.taskId] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations", workspaceId] });
    };

    socket.on("task:created", onTaskChange);
    socket.on("task:updated", onTaskChange);
    socket.on("task:moved", onTaskChange);
    socket.on("task:deleted", onTaskDeleted);
    socket.on("notification:new", onNotification);
    socket.on("comment:created", onCommentChange);
    socket.on("comment:updated", onCommentChange);
    socket.on("activity:new", onActivity);
    socket.on("message:new", onMessage);
    socket.on("presence:online", onPresence);
    socket.on("presence:offline", onPresence);
    socket.on("file:created", onFileChange);
    socket.on("file:deleted", onFileChange);
    socket.on("whatsapp:message", onWhatsAppMessage);

    return () => {
      socket.emit("leave:workspace", workspaceId);
      socket.off("connect", joinWorkspace);
      socket.off("task:created", onTaskChange);
      socket.off("task:updated", onTaskChange);
      socket.off("task:moved", onTaskChange);
      socket.off("task:deleted", onTaskDeleted);
      socket.off("notification:new", onNotification);
      socket.off("comment:created", onCommentChange);
      socket.off("comment:updated", onCommentChange);
      socket.off("activity:new", onActivity);
      socket.off("message:new", onMessage);
      socket.off("presence:online", onPresence);
      socket.off("presence:offline", onPresence);
      socket.off("file:created", onFileChange);
      socket.off("file:deleted", onFileChange);
      socket.off("whatsapp:message", onWhatsAppMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, workspaceId]);
}
