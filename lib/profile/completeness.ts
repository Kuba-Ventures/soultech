import { getCorpusStats } from "@/lib/db/stats";
import { getLearningStyle } from "@/lib/db/learningStyle";
import { listActiveTracks } from "@/lib/db/tracks";

/**
 * Profile completeness is derived, never stored, so it can't drift. It drives
 * the sidebar progress bar, the /overview ring, and the empty-vs-populated
 * state switch across the app (empty when `percent < EMPTY_THRESHOLD`).
 *
 * Phase 1 inputs: memory count, learning-style presence, active-track count.
 * Questionnaire completion and connections fold in during later phases.
 */
const TARGET_MEMORIES = 50;
const TARGET_TRACKS = 3;

/** Below this percent, screens render their empty (new-user) state. */
export const EMPTY_THRESHOLD = 15;

export type CompletenessGap = {
  key: string;
  label: string;
  why: string;
  href: string;
};

export type Completeness = {
  percent: number; // 0..100
  memoryCount: number;
  hasLearningStyle: boolean;
  trackCount: number;
  isEmpty: boolean;
  gaps: CompletenessGap[];
};

export async function getProfileCompleteness(
  memberId: string,
): Promise<Completeness> {
  const [stats, style, activeTracks] = await Promise.all([
    getCorpusStats(memberId),
    getLearningStyle(memberId),
    listActiveTracks(memberId),
  ]);

  const memoryScore = Math.min(1, stats.total / TARGET_MEMORIES);
  const styleScore = style ? 1 : 0;
  const trackScore = Math.min(1, activeTracks.length / TARGET_TRACKS);

  const raw = 0.5 * memoryScore + 0.25 * styleScore + 0.25 * trackScore;
  const percent = Math.round(Math.max(0, Math.min(1, raw)) * 100);

  const gaps: CompletenessGap[] = [];
  if (!style) {
    gaps.push({
      key: "learning_style",
      label: "How you learn best",
      why: "So I can pace the acceleration to you.",
      href: "/sources?tab=forms",
    });
  }
  if (stats.total < TARGET_MEMORIES) {
    gaps.push({
      key: "memories",
      label: "More about you",
      why: "Chat or add a source so the picture fills in.",
      href: "/sources",
    });
  }

  return {
    percent,
    memoryCount: stats.total,
    hasLearningStyle: Boolean(style),
    trackCount: activeTracks.length,
    isEmpty: percent < EMPTY_THRESHOLD,
    gaps,
  };
}
