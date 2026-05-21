import { and, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./client";
import { memories, sources, conversations, messages } from "./schema";

export type CorpusStats = {
  total: number;
  bySource: Record<"chat" | "upload_doc" | "upload_audio" | "voice_memo", number>;
  redacted: number;
  uploadsTotal: number;
  uploadsProcessing: number;
  uploadsFailed: number;
  conversationsTotal: number;
  messagesTotal: number;
  lastActivity: string | null;
};

export async function getCorpusStats(memberId: string): Promise<CorpusStats> {
  const db = getDb();

  const [memoryRows, sourceRows, conversationRows, messageRows] = await Promise.all([
    db
      .select({
        sourceType: memories.sourceType,
        redacted: memories.redacted,
        n: count(),
      })
      .from(memories)
      .where(eq(memories.memberId, memberId))
      .groupBy(memories.sourceType, memories.redacted),
    db
      .select({ status: sources.status, n: count() })
      .from(sources)
      .where(eq(sources.memberId, memberId))
      .groupBy(sources.status),
    db
      .select({ n: count() })
      .from(conversations)
      .where(eq(conversations.memberId, memberId)),
    db
      .select({
        n: count(),
        last: sql<Date | null>`max(${messages.createdAt})`,
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(eq(conversations.memberId, memberId)),
  ]);

  const bySource: CorpusStats["bySource"] = {
    chat: 0,
    upload_doc: 0,
    upload_audio: 0,
    voice_memo: 0,
  };
  let total = 0;
  let redacted = 0;
  for (const row of memoryRows) {
    const n = Number(row.n);
    if (!row.redacted) {
      bySource[row.sourceType] += n;
      total += n;
    } else {
      redacted += n;
    }
  }

  let uploadsTotal = 0;
  let uploadsProcessing = 0;
  let uploadsFailed = 0;
  for (const row of sourceRows) {
    const n = Number(row.n);
    uploadsTotal += n;
    if (row.status === "processing") uploadsProcessing += n;
    if (row.status === "failed") uploadsFailed += n;
  }

  const conversationsTotal = Number(conversationRows[0]?.n ?? 0);
  const messagesTotal = Number(messageRows[0]?.n ?? 0);
  const lastActivityRaw = messageRows[0]?.last ?? null;
  const lastActivity = lastActivityRaw
    ? new Date(lastActivityRaw).toISOString()
    : null;

  return {
    total,
    bySource,
    redacted,
    uploadsTotal,
    uploadsProcessing,
    uploadsFailed,
    conversationsTotal,
    messagesTotal,
    lastActivity,
  };
}

// Tiny helper used by /portal/memories headline; keeps stats imports contained.
export async function getMostRecentMemoryDate(
  memberId: string,
): Promise<Date | null> {
  const db = getDb();
  const rows = await db
    .select({ createdAt: memories.createdAt })
    .from(memories)
    .where(and(eq(memories.memberId, memberId), eq(memories.redacted, false)))
    .orderBy(desc(memories.createdAt))
    .limit(1);
  return rows[0]?.createdAt ?? null;
}
