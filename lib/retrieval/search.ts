import { and, cosineDistance, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { memories } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/models/generateEmbedding";

export type RetrievedMemory = {
  id: string;
  content: string;
  contentSummary: string;
  sourceType: "chat" | "upload_doc" | "upload_audio" | "voice_memo";
  sourceId: string | null;
  createdAt: Date;
  /** Cosine distance from query embedding (0 = identical, 2 = opposite). */
  distance: number;
};

const DEFAULT_LIMIT = 12;

/**
 * Vector search over the member's non-redacted corpus. Embeds the query with
 * `inputType: "query"` (Voyage distinguishes query vs document embeddings),
 * then orders by cosine distance using the HNSW index.
 */
export async function searchMemories(
  memberId: string,
  queryText: string,
  opts?: { limit?: number },
): Promise<RetrievedMemory[]> {
  const trimmed = queryText.trim();
  if (!trimmed) return [];

  const { embedding } = await generateEmbedding(trimmed, { inputType: "query" });
  return searchMemoriesByEmbedding(memberId, embedding, opts);
}

export async function searchMemoriesByEmbedding(
  memberId: string,
  embedding: number[],
  opts?: { limit?: number },
): Promise<RetrievedMemory[]> {
  const db = getDb();
  const distance = sql<number>`${cosineDistance(memories.embedding, embedding)}`;

  const rows = await db
    .select({
      id: memories.id,
      content: memories.content,
      contentSummary: memories.contentSummary,
      sourceType: memories.sourceType,
      sourceId: memories.sourceId,
      createdAt: memories.createdAt,
      distance,
    })
    .from(memories)
    .where(and(eq(memories.memberId, memberId), eq(memories.redacted, false)))
    .orderBy(distance)
    .limit(opts?.limit ?? DEFAULT_LIMIT);

  return rows as RetrievedMemory[];
}
