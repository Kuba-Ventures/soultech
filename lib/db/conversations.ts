import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./client";
import {
  conversations,
  messages,
  type Conversation,
  type Message,
  type NewMessage,
} from "./schema";

export const INTERVIEWER_TITLE = "AI Interviewer";

/**
 * Single ongoing interviewer conversation per member. Created on first use.
 */
export async function getOrCreateInterviewerConversation(
  memberId: string,
): Promise<Conversation> {
  const db = getDb();
  const existing = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.memberId, memberId),
        eq(conversations.title, INTERVIEWER_TITLE),
      ),
    )
    .limit(1);
  if (existing.length > 0) return existing[0];

  const inserted = await db
    .insert(conversations)
    .values({ memberId, title: INTERVIEWER_TITLE })
    .returning();
  return inserted[0];
}

export async function appendMessage(input: NewMessage): Promise<Message> {
  const db = getDb();
  const rows = await db.insert(messages).values(input).returning();
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, input.conversationId));
  return rows[0];
}

export async function listMessages(
  conversationId: string,
  opts?: { limit?: number },
): Promise<Message[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(opts?.limit ?? 200);
  return rows.reverse();
}
