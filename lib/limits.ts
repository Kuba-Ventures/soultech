import { and, count, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { conversations, messages, sources } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";

/**
 * Per-member daily rate limits. Counts are recomputed from the source tables
 * on every check; we accept the read cost in exchange for not having to
 * maintain a separate counter cache.
 */

export const DAILY_MEMBER_MESSAGE_LIMIT = 200;
export const DAILY_UPLOAD_COUNT_LIMIT = 25;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function enforceMessageLimit(memberId: string): Promise<void> {
  const since = new Date(Date.now() - DAY_MS);
  const db = getDb();
  const convos = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.memberId, memberId));
  if (convos.length === 0) return;
  const ids = convos.map((c) => c.id);

  const rows = await db
    .select({ n: count() })
    .from(messages)
    .where(
      and(
        inArray(messages.conversationId, ids),
        eq(messages.role, "member"),
        gte(messages.createdAt, since),
      ),
    );
  const used = Number(rows[0]?.n ?? 0);
  if (used >= DAILY_MEMBER_MESSAGE_LIMIT) {
    throw new AppError(
      "rate_limited",
      `Daily message limit reached (${DAILY_MEMBER_MESSAGE_LIMIT}). Come back in a few hours.`,
    );
  }
}

export async function enforceUploadLimit(memberId: string): Promise<void> {
  const since = new Date(Date.now() - DAY_MS);
  const db = getDb();
  const rows = await db
    .select({ n: count() })
    .from(sources)
    .where(and(eq(sources.memberId, memberId), gte(sources.createdAt, since)));
  const used = Number(rows[0]?.n ?? 0);
  if (used >= DAILY_UPLOAD_COUNT_LIMIT) {
    throw new AppError(
      "rate_limited",
      `Daily upload limit reached (${DAILY_UPLOAD_COUNT_LIMIT}). Try again tomorrow.`,
    );
  }
}
