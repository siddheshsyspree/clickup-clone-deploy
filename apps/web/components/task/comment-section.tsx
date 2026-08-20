"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, Mail, MessageSquare, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RichTextComposer, RichTextContent, docToPlainText } from "@/components/ui/rich-text";
import { createComment } from "@/lib/queries/tasks";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { TaskDetail } from "@/lib/queries/tasks";

type Mode = "COMMENT" | "EMAIL" | "WHATSAPP";

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/;

export function CommentSection({ task }: { task: TaskDetail }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [mode, setMode] = useState<Mode>("COMMENT");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [phone, setPhone] = useState("");

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof createComment>[1]) => createComment(task.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
      setTo("");
      setCc("");
      setBcc("");
      setSubject("");
      setShowCc(false);
      setShowBcc(false);
      setPhone("");
      setMode("COMMENT");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not post"),
  });

  function switchMode(next: Mode) {
    setMode(next);
    // Best-effort convenience: most client tasks have contact details typed
    // somewhere in the brief/description — there's no structured field for
    // either, so this is scan-and-guess, not a real lookup.
    if (next === "EMAIL" && !to) {
      const found = docToPlainText(task.description).match(EMAIL_RE);
      if (found) setTo(found[0]);
    }
    if (next === "WHATSAPP" && !phone) {
      const found = docToPlainText(task.description).match(PHONE_RE);
      if (found) setPhone(found[0].trim());
    }
  }

  function parseList(value: string) {
    return value
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <MessageSquare className="h-4 w-4" />
        Comments ({task.comments.length})
      </p>

      <div className="space-y-4">
        {task.comments.map((comment) => (
          <div key={comment.id} className="flex gap-2.5">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={comment.author.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xs">{comment.author.name[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{comment.author.name}</span>
                {comment.channel === "EMAIL" && (
                  <span className="flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <Mail className="h-2.5 w-2.5" /> Email
                  </span>
                )}
                {comment.channel === "WHATSAPP" && (
                  <span className="flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <Phone className="h-2.5 w-2.5" /> WhatsApp
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>
              {comment.channel === "EMAIL" && comment.emailMeta && (
                <p className="mb-1 text-xs text-muted-foreground">
                  To: {comment.emailMeta.to}
                  {!!comment.emailMeta.cc?.length && ` · Cc: ${comment.emailMeta.cc.join(", ")}`}
                  {" · "}
                  {comment.emailMeta.subject}
                </p>
              )}
              {comment.channel === "WHATSAPP" && comment.whatsappMeta && (
                <p className="mb-1 text-xs text-muted-foreground">
                  To: {comment.whatsappMeta.phone}
                </p>
              )}
              {/* Comments written before the editor existed are plain strings; the
                  renderer normalises both shapes. */}
              <RichTextContent value={comment.content} className="text-foreground" />
            </div>
          </div>
        ))}
        {!task.comments.length && <p className="text-sm text-muted-foreground">No comments yet.</p>}
      </div>

      <div className="flex items-start gap-2.5 pt-2">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={user?.avatarUrl ?? undefined} />
          <AvatarFallback className="text-xs">{(user?.name ?? "?")[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none">
              {mode === "EMAIL" && <Mail className="h-3.5 w-3.5" />}
              {mode === "WHATSAPP" && <Phone className="h-3.5 w-3.5" />}
              {mode === "COMMENT" && <MessageSquare className="h-3.5 w-3.5" />}
              {mode === "EMAIL" ? "Email" : mode === "WHATSAPP" ? "WhatsApp" : "Comment"}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              <DropdownMenuItem onClick={() => switchMode("COMMENT")}>
                <MessageSquare className="h-4 w-4" /> Comment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchMode("EMAIL")}>
                <Mail className="h-4 w-4" /> Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchMode("WHATSAPP")}>
                <Phone className="h-4 w-4" /> WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {mode === "EMAIL" && (
            <div className="space-y-1.5 rounded-lg border border-border p-2">
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-muted-foreground">To</span>
                <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@company.com" className="h-7 flex-1 text-xs" />
                {!showCc && (
                  <button onClick={() => setShowCc(true)} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button onClick={() => setShowBcc(true)} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
                    Bcc
                  </button>
                )}
              </div>
              {showCc && (
                <div className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-xs text-muted-foreground">Cc</span>
                  <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="comma-separated" className="h-7 flex-1 text-xs" />
                </div>
              )}
              {showBcc && (
                <div className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-xs text-muted-foreground">Bcc</span>
                  <Input value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="comma-separated" className="h-7 flex-1 text-xs" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-muted-foreground">Subject</span>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="h-7 flex-1 text-xs" />
              </div>
            </div>
          )}

          {mode === "WHATSAPP" && (
            <div className="space-y-1.5 rounded-lg border border-border p-2">
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-muted-foreground">Phone</span>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" className="h-7 flex-1 text-xs" />
              </div>
            </div>
          )}

          <RichTextComposer
            placeholder={mode === "EMAIL" ? "Write your email…" : mode === "WHATSAPP" ? "Write your WhatsApp message…" : "Leave a comment…"}
            submitLabel={mode === "EMAIL" ? "Send email" : mode === "WHATSAPP" ? "Send WhatsApp" : "Comment"}
            disabled={mutation.isPending}
            onSubmit={async (doc, html) => {
              if (mode === "EMAIL") {
                if (!to.trim()) {
                  toast.error("Add a recipient email address");
                  return;
                }
                if (!subject.trim()) {
                  toast.error("Add a subject");
                  return;
                }
                await mutation.mutateAsync({
                  content: doc,
                  channel: "EMAIL",
                  email: { to: to.trim(), cc: parseList(cc), bcc: parseList(bcc), subject: subject.trim(), html },
                });
                toast.success("Email sent");
              } else if (mode === "WHATSAPP") {
                if (!phone.trim()) {
                  toast.error("Add a phone number");
                  return;
                }
                await mutation.mutateAsync({
                  content: doc,
                  channel: "WHATSAPP",
                  whatsapp: { phone: phone.trim(), body: docToPlainText(doc) },
                });
                toast.success("WhatsApp message sent");
              } else {
                await mutation.mutateAsync({ content: doc, channel: "COMMENT" });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
