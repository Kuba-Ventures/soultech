import Link from "next/link";
import { getCurrentMember } from "@/lib/db/members";
import { getLearningStyle } from "@/lib/db/learningStyle";
import { listActiveTracks } from "@/lib/db/tracks";
import { ClimbingCurve } from "@/components/learn/ClimbingCurve";
import { LearningStyleCard } from "@/components/learn/LearningStyleCard";
import { TrackCard } from "@/components/learn/TrackCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

const STYLE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 7l9-4 9 4-9 4-9-4zM7 10v5c0 1.5 2.7 3 5 3s5-1.5 5-3v-5" />
  </svg>
);

export default async function LearnPage() {
  const member = await getCurrentMember();
  const [style, tracks] = await Promise.all([
    getLearningStyle(member.id),
    listActiveTracks(member.id),
  ]);

  // Populated when the clone has something to show; otherwise the new-user
  // empty state ("I don't know how you learn yet").
  const populated = Boolean(style) || tracks.length > 0;

  return (
    <section className="screen on">
      <div className="eyebrow rise">Accelerate</div>
      <ClimbingCurve />

      {populated ? (
        <>
          {style && <LearningStyleCard style={style} />}

          {tracks.length > 0 && (
            <>
              <div className="sect">
                What you&rsquo;re leveling up<span className="ln" />
              </div>
              <div className="rise">
                {tracks.map((t) => (
                  <TrackCard key={t.id} track={t} />
                ))}
              </div>
            </>
          )}

          <div style={{ marginTop: 22 }} className="rise">
            <Link className="btn cool" href="/plugin">
              Turn this on inside Claude &amp; Cursor →
            </Link>
          </div>
        </>
      ) : (
        <>
          <div style={{ margin: "20px 0 26px" }}>
            <EmptyState
              icon={STYLE_ICON}
              title="I don't know how you learn yet."
              body="Give me two minutes or one connection, and I'll work out how you learn best, then start building tracks around it."
              actions={[
                { label: "Take the 2-min style quiz", href: "/sources?tab=forms" },
                { label: "Connect a tool", href: "/sources?tab=connect", ghost: true },
              ]}
            />
          </div>
          <div className="sect">
            Your tracks will appear here<span className="ln" />
          </div>
          <div className="rise">
            <div className="ghosttrack">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
              </svg>
              A skill you&rsquo;re working on, with the next rep tuned to you
            </div>
            <div className="ghosttrack">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
              </svg>
              Another, picked up from what you connect
            </div>
          </div>
        </>
      )}
    </section>
  );
}
