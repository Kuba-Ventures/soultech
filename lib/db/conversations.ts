import { and, desc, eq, inArray } from "drizzle-orm";
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
 * Delete every conversation (and its messages) for a member. Returns the
 * number of conversations removed. Messages are removed explicitly rather than
 * relying on the FK cascade, matching the reset flow elsewhere.
 */
export async function deleteAllChats(memberId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.memberId, memberId));
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return 0;

  await db.delete(messages).where(inArray(messages.conversationId, ids));
  await db.delete(conversations).where(eq(conversations.memberId, memberId));
  return ids.length;
}

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

const NEW_CHAT_TITLE = "New chat";

/** Start a fresh saved chat. */
export async function createChat(
  memberId: string,
  title: string = NEW_CHAT_TITLE,
): Promise<Conversation> {
  const inserted = await getDb()
    .insert(conversations)
    .values({ memberId, title })
    .returning();
  return inserted[0];
}

/** All of a member's saved chats (everything except the interviewer), newest activity first. */
export async function listChats(memberId: string): Promise<Conversation[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.memberId, memberId))
    .orderBy(desc(conversations.lastMessageAt));
  return rows.filter((c) => c.title !== INTERVIEWER_TITLE);
}

/** A specific chat, only if it belongs to the member. */
export async function getChat(
  memberId: string,
  id: string,
): Promise<Conversation | null> {
  const rows = await getDb()
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.memberId, memberId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Name a still-default chat from its first message (a short snippet). */
export async function maybeTitleChat(
  conversationId: string,
  fromMessage: string,
): Promise<void> {
  const snippet = fromMessage.replace(/\s+/g, " ").trim().slice(0, 48);
  if (!snippet) return;
  await getDb()
    .update(conversations)
    .set({ title: snippet })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.title, NEW_CHAT_TITLE),
      ),
    );
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
