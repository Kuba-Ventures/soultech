import type { Track } from "@/lib/db/schema";

const LEVEL_LABEL: Record<Track["level"], string> = {
  beginner: "Beginner",
  building: "Building",
  fluent: "Fluent",
  mastering: "Mastering",
};

/**
 * One skill track on /learn: name, level, a cool-tinted progress bar, an
 * optional progress caption, and the "next rep" suggestion written in the
 * member's learning style.
 */
export function TrackCard({ track }: { track: Track }) {
  const pct = Math.round(Math.max(0, Math.min(1, track.progress)) * 100);
  return (
    <div className="track">
      <div className="th">
        <span className="tn">{track.name}</span>
        <span className="lvl">{LEVEL_LABEL[track.level]}</span>
      </div>
      <div className="bar">
        <i className="cool" style={{ width: `${pct}%` }} />
      </div>
      {track.progressNote && <div className="pctn">{track.progressNote}</div>}
      {track.nextRep && (
        <div className="next">
          <span className="nl">Your clone suggests, built for how you learn</span>
          <b>{track.nextRep}</b>
        </div>
      )}
    </div>
  );
}
