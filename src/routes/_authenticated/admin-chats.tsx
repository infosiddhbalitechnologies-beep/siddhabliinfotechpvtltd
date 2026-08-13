import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listAdminChatSessions,
  getAdminChatSession,
} from "@/lib/chat.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin-chats")({
  head: () => ({ meta: [{ title: "Admin · Chats — SIDDHBALI TECHNOLOGIES" }] }),
  component: AdminChats,
});

function AdminChats() {
  const list = useServerFn(listAdminChatSessions);
  const detail = useServerFn(getAdminChatSession);
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-chats"],
    queryFn: () => list(),
    retry: false,
  });
  const { data: convo } = useQuery({
    queryKey: ["admin-chat", selected],
    queryFn: () => detail({ data: { sessionId: selected! } }),
    enabled: !!selected,
    retry: false,
  });

  if (isError) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-display font-bold">
          Admin access required
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {(error as Error)?.message}
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-display font-bold">
        Admin · Chat Conversations
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        All AI assistant conversations.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-border">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : (data?.sessions?.length ?? 0) === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No conversations yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data!.sessions.map((s: any) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelected(s.id)}
                    className={cn(
                      "block w-full px-3 py-3 text-left text-sm hover:bg-muted/40",
                      selected === s.id && "bg-muted/60",
                    )}
                  >
                    <p className="line-clamp-1 font-medium text-foreground">
                      {s.title ?? "Untitled chat"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {s.user_email ?? (s.guest_token ? "Guest" : "—")} ·{" "}
                      {new Date(s.updated_at).toLocaleString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-border p-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              Select a conversation to view messages.
            </p>
          ) : !convo ? (
            <p className="text-sm text-muted-foreground">
              Loading conversation…
            </p>
          ) : (
            <div className="space-y-3">
              {convo.messages.map((m: any) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {m.content}
                    <div className="mt-1 text-[10px] opacity-70">
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
