"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getWhatsAppThread, sendWhatsAppMessage } from "@/lib/queries/whatsapp";
import { docToPlainText } from "@/components/ui/rich-text";
import { ApiError } from "@/lib/api-client";
import type { TaskDetail } from "@/lib/queries/tasks";

const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/;

/**
 * Just the starter here — once a thread exists, the ongoing conversation
 * lives in the dedicated WhatsApp Team Inbox (its own nav item), the same
 * way every client's thread is visible to the whole team there. Keeping a
 * second live copy of the thread inside this dialog would just be two UIs
 * showing the same data.
 */
export function WhatsAppThread({ task }: { task: TaskDetail }) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");

  const { data: thread, isLoading } = useQuery({
    queryKey: ["whatsapp", task.id],
    queryFn: () => getWhatsAppThread(task.id),
  });

  useEffect(() => {
    if (!phone && !thread?.phone) {
      const found = docToPlainText(task.description).match(PHONE_RE);
      if (found) setPhone(found[0].trim());
    }
  }, [thread?.phone, task.description, phone]);

  const mutation = useMutation({
    mutationFn: () => sendWhatsAppMessage(task.id, { phone: phone.trim(), body: body.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", task.id] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations", task.project.workspaceId] });
      setBody("");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not send WhatsApp message"),
  });

  function submit() {
    if (!phone.trim() || !body.trim()) return;
    mutation.mutate();
  }

  if (isLoading) return null;

  if (thread?.phone) {
    return (
      <Link
        href={`/workspace/${task.project.workspaceId}/whatsapp/${task.id}`}
        className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-accent"
      >
        <Phone className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">
          WhatsApp conversation with <span className="font-medium">+{thread.phone}</span>
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-border p-2">
      <p className="flex items-center gap-1.5 px-0.5 text-sm font-medium">
        <Phone className="h-4 w-4" />
        WhatsApp
      </p>
      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" className="h-8 text-xs" />
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="First message…"
          rows={1}
          className="flex-1 resize-none rounded-lg border border-input bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="sm" onClick={submit} disabled={!phone.trim() || !body.trim() || mutation.isPending}>
          Start
        </Button>
      </div>
    </div>
  );
}
