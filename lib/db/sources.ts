import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { sources, type Source, type NewSource } from "./schema";

export async function createSource(input: NewSource): Promise<Source> {
  const db = getDb();
  const rows = await db.insert(sources).values(input).returning();
  return rows[0];
}

export async function markSourceReady(sourceId: string): Promise<void> {
  const db = getDb();
  await db
    .update(sources)
    .set({ status: "ready", processedAt: new Date() })
    .where(eq(sources.id, sourceId));
}

export async function markSourceFailed(sourceId: string): Promise<void> {
  const db = getDb();
  await db
    .update(sources)
    .set({ status: "failed", processedAt: new Date() })
    .where(eq(sources.id, sourceId));
}
