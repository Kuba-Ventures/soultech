import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "./client";
import { memories, type Memory, type NewMemory } from "./schema";
import { generateEmbedding } from "@/lib/models/generateEmbedding";
import { logAudit } from "@/lib/audit";

const SUMMARY_MAX = 200;

/**
 * Cheap, deterministic summary. The build plan calls for a Haiku-generated
 * one-sentence summary on uploads; we use that path for upload memories. For
 * chat memories (which are short by nature), a content-based snippet is fine
 * for v1 and avoids an extra model call on every keystroke-equivalent.
 */
function snippetSummary(content: string): string {
  const collapsed = content.replace(/\s+/g, " ").trim();
  if (collapsed.length <= SUMMARY_MAX) return collapsed;
  return collapsed.slice(0, SUMMARY_MAX - 1).trimEnd() + "…";
}

export type CreateMemoryInput = Omit<NewMemory, "embedding" | "contentSummary"> & {
  contentSummary?: string;
};

/**
 * Embed + persist + audit, in that order. If embedding fails, we never write a
 * partial memory row.
 */
export async function createMemory(input: CreateMemoryInput): Promise<Memory> {
  const summary = input.contentSummary ?? snippetSummary(input.content);
  const { embedding } = await generateEmbedding(input.content, {
    inputType: "document",
  });

  const db = getDb();
  const rows = await db
    .insert(memories)
    .values({
      ...input,
      contentSummary: summary,
      embedding,
    })
    .returning();
  const memory = rows[0];

  await logAudit({
    memberId: memory.memberId,
    actor: "system",
    action: "memory.created",
    targetType: "memory",
    targetId: memory.id,
    details: {
      sourceType: memory.sourceType,
      sourceId: memory.sourceId,
      contentLength: input.content.length,
    },
  });

  return memory;
}

export async function listMemories(
  memberId: string,
  opts?: { limit?: number; offset?: number; includeRedacted?: boolean },
): Promise<Memory[]> {
  const db = getDb();
  const where = opts?.includeRedacted
    ? eq(memories.memberId, memberId)
    : and(eq(memories.memberId, memberId), eq(memories.redacted, false));
  return db
    .select()
    .from(memories)
    .where(where)
    .orderBy(desc(memories.createdAt))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);
}

/** Top recent typed memories (facts/plans/preferences) for the sidebar brain panel. */
export async function listHighlightMemories(
  memberId: string,
  limit = 6,
): Promise<Array<{ id: string; type: Memory["type"]; summary: string }>> {
  const db = getDb();
  const rows = await db
    .select({
      id: memories.id,
      type: memories.type,
      summary: memories.contentSummary,
    })
    .from(memories)
    .where(
      and(
        eq(memories.memberId, memberId),
        eq(memories.redacted, false),
        inArray(memories.type, ["FACT", "PLAN", "PREFERENCE"]),
      ),
    )
    .orderBy(desc(memories.createdAt))
    .limit(limit);
  return rows;
}

export async function redactMemory(
  memberId: string,
  memoryId: string,
  reason?: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(memories)
    .set({ redacted: true, redactionReason: reason ?? null })
    .where(and(eq(memories.id, memoryId), eq(memories.memberId, memberId)));
  await logAudit({
    memberId,
    actor: "member",
    action: "memory.redacted",
    targetType: "memory",
    targetId: memoryId,
    details: { reason: reason ?? null },
  });
}
