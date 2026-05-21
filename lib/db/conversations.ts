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
export const REFLECTIVE_TITLE = "Reflective Chat";

/**
 * Single ongoing conversation per member, by title. Created on first use.
 */
async function getOrCreateConversationByTitle(
  memberId: string,
  title: string,
): Promise<Conversation> {
  const db = getDb();
  const existing = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.memberId, memberId), eq(conversations.title, title)))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const inserted = await db
    .insert(conversations)
    .values({ memberId, title })
    .returning();
  return inserted[0];
}

export function getOrCreateInterviewerConversation(memberId: string) {
  return getOrCreateConversationByTitle(memberId, INTERVIEWER_TITLE);
}

export function getOrCreateReflectiveConversation(memberId: string) {
  return getOrCreateConversationByTitle(memberId, REFLECTIVE_TITLE);
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
