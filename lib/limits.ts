import { and, count, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditLog, conversations, messages, sources } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";

/**
 * Per-member daily rate limits. Counts are recomputed from the source tables
 * on every check; we accept the read cost in exchange for not having to
 * maintain a separate counter cache.
 */

export const DAILY_MEMBER_MESSAGE_LIMIT = 200;
export const DAILY_UPLOAD_COUNT_LIMIT = 25;
export const DAILY_MCP_WRITE_LIMIT = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Cap write-back from connected tools (MCP save_memory / advance_track) so a
 * compromised or runaway client can't drive unbounded embedding cost + DB
 * growth on the public endpoint. Counts MCP write audit rows in the last day.
 */
export async function enforceMcpWriteLimit(memberId: string): Promise<void> {
  const since = new Date(Date.now() - DAY_MS);
  const db = getDb();
  const rows = await db
    .select({ n: count() })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.memberId, memberId),
        inArray(auditLog.action, ["mcp.save_memory", "mcp.advance_track"]),
        gte(auditLog.createdAt, since),
      ),
    );
  if (Number(rows[0]?.n ?? 0) >= DAILY_MCP_WRITE_LIMIT) {
    throw new AppError(
      "rate_limited",
      `Daily write-back limit reached (${DAILY_MCP_WRITE_LIMIT}). Connected tools can write again tomorrow.`,
    );
  }
}

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
