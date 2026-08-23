import { Phone } from "lucide-react";

export default function WhatsAppIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Phone className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">Select a conversation</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Open a client&apos;s task and add a phone number to start one.
      </p>
    </div>
  );
}
