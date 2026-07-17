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
  /**
   * The slices still missing from the ring, from `remainingSegments`. Rendered
   * as the "Not yet added" group so a member can see what's left to reach 100%.
   * Optional so older callers (and the empty state) degrade to just the donut.
   */
  remaining?: LearnedSegment[];
};

export function LearnedDonut({ percent, segments, remaining = [] }: Props) {
  const hasLegend = segments.length > 0 || remaining.length > 0;
  return (
    // items-start so the two-group legend can grow taller than the donut.
    <div className="mt-4 flex flex-wrap items-start gap-x-6 gap-y-4">
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
      {hasLegend && (
        // Sits beside the donut when there's room, wraps cleanly below it when
        // the card is narrow. Two groups — what's learned, and what's left.
        <div className="flex-[1_1_12rem] space-y-3.5">
          {segments.length > 0 && (
            <LegendGroup title="Learned" total={percent} items={segments} filled />
          )}
          {remaining.length > 0 && (
            <LegendGroup title="Not yet added" total={100 - percent} items={remaining} />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One legend column. `filled` slices carry a solid swatch (points already
 * earned); the rest are drawn hollow in the same hue (headroom the member can
 * still fill). Each row shows its share of the ring; the header totals them.
 */
function LegendGroup({
  title,
  total,
  items,
  filled = false,
}: {
  title: string;
  total: number;
  items: LearnedSegment[];
  filled?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--t-faint)]">
        <span>{title}</span>
        <span className="[font-variant-numeric:tabular-nums]">{Math.round(total)}%</span>
      </div>
      <ul className="mt-1.5 grid gap-1.5 text-[13px] text-[var(--t-dim)]">
        {items.map((seg) => (
          <li key={seg.key} className="flex items-center gap-2">
            <span
              className="h-2 w-2 flex-none rounded-[2px]"
              style={
                filled
                  ? { background: SEGMENT_COLOR[seg.key] }
                  : { border: `1px solid ${SEGMENT_COLOR[seg.key]}`, opacity: 0.55 }
              }
            />
            <span className="flex-1">{seg.label}</span>
            <span className="[font-variant-numeric:tabular-nums] text-[var(--t-faint)]">
              {Math.round(seg.pct)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
