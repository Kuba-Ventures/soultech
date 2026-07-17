import type { LearnedSegment } from "@/lib/profile/v1/knowledge";
import type { SectionKey } from "@/lib/profile/v1/types";

/**
 * The "Learned %" donut: how well Soultech knows a member, sliced by what
 * taught it. Reader-facing sections take a warm (amber) sweep — the parts of
 * *you* Soultech has read — and the source-variety slice is cool, so breadth
 * reads as corroboration set apart from coverage. Shared by the profile hub
 * and the onboarding payoff; both feed it the same computeKnowledge output.
 */
const SEGMENT_COLOR: Record<SectionKey | "breadth", string> = {
  how_you_learn: "#f2bd76",
  how_you_communicate: "#f0a84c",
  how_you_think: "#e2913a",
  what_you_value: "#cf7d2b",
  what_youre_into: "#f6d4a6",
  quirks: "#b8691f",
  breadth: "#79c6d4",
};

const RING_TRACK = "rgba(245, 238, 227, 0.06)";
const RING_GAP = 0.8; // % of the ring blanked between adjacent slices, for legibility
const DONUT_MASK = "radial-gradient(closest-side, transparent 63%, #000 64%)";

/** Conic-gradient for the donut, built from its slices with thin gaps. */
function ringGradient(segments: LearnedSegment[]): string {
  if (segments.length === 0) return RING_TRACK;
  const stops: string[] = [];
  let pos = 0;
  segments.forEach((seg, i) => {
    const end = Math.min(100, pos + seg.pct);
    stops.push(`${SEGMENT_COLOR[seg.key]} ${pos}% ${end}%`);
    pos = end;
    // A blank slit lets adjacent warm slices stay distinct without a legend glance.
    if (i < segments.length - 1 && pos < 100) {
      const gapEnd = Math.min(100, pos + RING_GAP);
      stops.push(`transparent ${pos}% ${gapEnd}%`);
      pos = gapEnd;
    }
  });
  if (pos < 100) stops.push(`${RING_TRACK} ${pos}% 100%`);
  return `conic-gradient(${stops.join(", ")})`;
}

type Props = {
  percent: number;
  segments: LearnedSegment[];
};

export function LearnedDonut({ percent, segments }: Props) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4">
      <div
        className="relative h-[116px] w-[116px] flex-none"
        role="img"
        aria-label={`Soultech has learned ${percent}% of you`}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background: ringGradient(segments),
            WebkitMask: DONUT_MASK,
            mask: DONUT_MASK,
          }}
        />
        <div className="absolute inset-0 grid place-content-center">
          <div className="font-display text-[27px] leading-none text-[var(--text)] [font-variant-numeric:tabular-nums]">
            {percent}
            <span className="ml-0.5 text-[13px] text-[var(--t-dim)]">%</span>
          </div>
        </div>
      </div>
      {segments.length > 0 && (
        // Sits beside the donut when there's room, wraps cleanly below it when
        // the card is narrow. Labels break between words only — never mid-word.
        <ul className="grid flex-[1_1_11rem] gap-1.5 text-[13px] text-[var(--t-dim)]">
          {segments.map((seg) => (
            <li key={seg.key} className="flex items-center gap-2">
              <span
                className="h-2 w-2 flex-none rounded-[2px]"
                style={{ background: SEGMENT_COLOR[seg.key] }}
              />
              <span>{seg.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
