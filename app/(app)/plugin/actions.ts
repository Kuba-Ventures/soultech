"use server";

import { getCurrentMember } from "@/lib/db/members";
import { listActiveTracks, advanceTrack } from "@/lib/db/tracks";

export type MemoryFlowResult = { ok: boolean; toast: string };

/**
 * The "watch a memory flow" demo: simulates a Claude session writing a memory
 * back, which nudges the matching learning track forward. This is the real
 * loop against the DB (the same advanceTrack the MCP `advance_track` tool will
 * call in Phase 3), so the bump shows up on /learn.
 */
export async function watchMemoryFlow(): Promise<MemoryFlowResult> {
  const member = await getCurrentMember();
  const tracks = await listActiveTracks(member.id);
  if (tracks.length === 0) {
    return {
      ok: false,
      toast: "Connect a tool to start your first track.",
    };
  }

  const target =
    tracks.find((t) => /claude|subagent|orchestration/i.test(t.name)) ??
    tracks[0];
  const before = Math.round(target.progress * 100);
  const updated = await advanceTrack(
    member.id,
    target.name,
    0.04,
    "+4 from your last Claude session, automatically",
    "demo",
  );
  const after = updated ? Math.round(updated.progress * 100) : before;

  return {
    ok: true,
    toast: `Memory written back from Claude · ${target.name} ${before}% → ${after}%`,
  };
}
