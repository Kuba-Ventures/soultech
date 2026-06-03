import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./client";
import { tracks, type Track } from "./schema";

/**
 * Active skill tracks for a member, highest-progress first. Drives the
 * "What you're leveling up" list on /learn. Returns [] when the member has
 * none yet (Phase 1 falls back to the empty state).
 */
export async function listActiveTracks(memberId: string): Promise<Track[]> {
  const db = getDb();
  return db
    .select()
    .from(tracks)
    .where(and(eq(tracks.memberId, memberId), eq(tracks.status, "active")))
    .orderBy(desc(tracks.progress));
}
