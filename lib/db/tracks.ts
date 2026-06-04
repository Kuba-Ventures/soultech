import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./client";
import { tracks, type Track } from "./schema";
import { logAudit } from "@/lib/audit";

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

const LEVEL_THRESHOLDS: Array<{ at: number; level: Track["level"] }> = [
  { at: 0.85, level: "mastering" },
  { at: 0.6, level: "fluent" },
  { at: 0.3, level: "building" },
  { at: 0, level: "beginner" },
];

function levelFor(progress: number): Track["level"] {
  return LEVEL_THRESHOLDS.find((t) => progress >= t.at)!.level;
}

/**
 * Nudge a track forward by `delta` (clamped to [0,1]), recompute its level,
 * and audit the change. This is what "closes the loop" — called by the
 * /plugin "watch a memory flow" demo now, and by the MCP `advance_track`
 * write tool in Phase 3. Resolves the track by (member, name); returns null
 * if no such track exists.
 */
export async function advanceTrack(
  memberId: string,
  name: string,
  delta: number,
  reason: string,
  source: "demo" | "mcp" = "demo",
): Promise<Track | null> {
  const db = getDb();
  const found = await db
    .select()
    .from(tracks)
    .where(and(eq(tracks.memberId, memberId), eq(tracks.name, name)))
    .limit(1);
  if (found.length === 0) return null;

  const before = found[0].progress;
  const after = Math.max(0, Math.min(1, before + delta));
  const pct = Math.round(after * 100);
  const updated = await db
    .update(tracks)
    .set({
      progress: after,
      level: levelFor(after),
      progressNote: `${pct}% · ${reason}`,
      updatedAt: new Date(),
    })
    .where(eq(tracks.id, found[0].id))
    .returning();

  await logAudit({
    memberId,
    actor: "system",
    action: "track.advanced",
    targetType: "track",
    targetId: found[0].id,
    details: { name, delta, before, after, reason, via: source },
  });

  return updated[0];
}
