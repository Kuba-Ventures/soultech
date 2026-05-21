import { eq, inArray } from "drizzle-orm";
import { getCurrentMember } from "@/lib/db/members";
import {
  getOrCreateReflectiveConversation,
  listMessages,
} from "@/lib/db/conversations";
import { getDb } from "@/lib/db/client";
import { memories } from "@/lib/db/schema";
import { ReflectiveChat } from "@/components/portal/ReflectiveChat";
import type { CitedMessage } from "./actions";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const member = await getCurrentMember();
  const convo = await getOrCreateReflectiveConversation(member.id);
  const msgs = await listMessages(convo.id, { limit: 100 });

  // Hydrate citation memory snippets for any clone messages with cited IDs.
  const allCitedIds = Array.from(
    new Set(msgs.flatMap((m) => (m.role === "clone" ? m.citations : []))),
  );
  const db = getDb();
  const citedMemories = allCitedIds.length
    ? await db
        .select({
          id: memories.id,
          content: memories.content,
          contentSummary: memories.contentSummary,
          sourceType: memories.sourceType,
          createdAt: memories.createdAt,
        })
        .from(memories)
        .where(inArray(memories.id, allCitedIds))
    : [];
  const memById = new Map(citedMemories.map((m) => [m.id, m]));

  const initialMessages: CitedMessage[] = msgs.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    citations:
      m.role === "clone"
        ? m.citations
            .map((id, idx) => {
              const ref = memById.get(id);
              if (!ref) return null;
              return {
                id,
                label: `M${idx + 1}`,
                sourceType: ref.sourceType,
                createdAt: ref.createdAt.toISOString(),
                contentSummary: ref.contentSummary,
                content: ref.content,
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
        : [],
  }));

  return (
    <div className="h-full flex flex-col">
      <header className="px-8 pt-10 pb-4 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
          Chat
        </div>
        <h1 className="mt-2 text-3xl font-medium tracking-[-0.02em]">
          Talk with your clone.
        </h1>
        <p className="mt-3 text-sm text-white/55 leading-relaxed">
          The clone draws on your memories. Citations open inline. Use Reflect
          to feed it more, or Memories to review and redact what it sees.
        </p>
      </header>
      <ReflectiveChat initialMessages={initialMessages} />
    </div>
  );
}
