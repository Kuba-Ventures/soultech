import { eq, inArray } from "drizzle-orm";
import { getDb } from "./client";
import {
  members,
  memories,
  sources,
  conversations,
  messages,
  learningStyles,
  tracks,
  toolConnections,
  auditLog,
} from "./schema";

export type WipeCounts = {
  conversations: number;
  messages: number;
  memories: number;
  sources: number;
  learningStyles: number;
  tracks: number;
  toolConnections: number;
};

/**
 * Wipe every byte of a member's data without deleting the account itself.
 * Removes chats, memories, sources, learning styles, tracks, tool connections,
 * and the audit trail, then clears `members.settings` — which also clears the
 * v1 profile, onboarding flag, and calibration signals (all stored there). The
 * member row and Clerk account remain, so the next visit starts from a clean
 * slate (and re-enters onboarding).
 */
export async function wipeMemberData(memberId: string): Promise<WipeCounts> {
  const db = getDb();

  const convoRows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.memberId, memberId));
  const convoIds = convoRows.map((c) => c.id);

  let deletedMessages = 0;
  if (convoIds.length > 0) {
    const rows = await db
      .delete(messages)
      .where(inArray(messages.conversationId, convoIds))
      .returning({ id: messages.id });
    deletedMessages = rows.length;
  }

  // Sequential and in FK-safe order (memories reference sources) to avoid
  // races on the serverless HTTP driver.
  const conversationsDeleted = await db
    .delete(conversations)
    .where(eq(conversations.memberId, memberId))
    .returning({ id: conversations.id });
  const memoriesDeleted = await db
    .delete(memories)
    .where(eq(memories.memberId, memberId))
    .returning({ id: memories.id });
  const sourcesDeleted = await db
    .delete(sources)
    .where(eq(sources.memberId, memberId))
    .returning({ id: sources.id });
  const learningStylesDeleted = await db
    .delete(learningStyles)
    .where(eq(learningStyles.memberId, memberId))
    .returning({ id: learningStyles.id });
  const tracksDeleted = await db
    .delete(tracks)
    .where(eq(tracks.memberId, memberId))
    .returning({ id: tracks.id });
  const toolConnectionsDeleted = await db
    .delete(toolConnections)
    .where(eq(toolConnections.memberId, memberId))
    .returning({ id: toolConnections.id });

  // Audit trail last; the caller logs a fresh "reset" entry after this returns.
  await db.delete(auditLog).where(eq(auditLog.memberId, memberId));

  await db.update(members).set({ settings: {} }).where(eq(members.id, memberId));

  return {
    conversations: conversationsDeleted.length,
    messages: deletedMessages,
    memories: memoriesDeleted.length,
    sources: sourcesDeleted.length,
    learningStyles: learningStylesDeleted.length,
    tracks: tracksDeleted.length,
    toolConnections: toolConnectionsDeleted.length,
  };
}
