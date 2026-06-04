import type { LearningStyle } from "@/lib/db/schema";

/**
 * The amber "Your learning style, distilled" card. Renders the inferred prose
 * summary plus trait pills. Only rendered when a learning style exists.
 */
export function LearningStyleCard({ style }: { style: LearningStyle }) {
  return (
    <div className="lstyle rise">
      <div className="lab">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 7l9-4 9 4-9 4-9-4zM7 10v5c0 1.5 2.7 3 5 3s5-1.5 5-3v-5" />
        </svg>
        Your learning style, distilled
      </div>
      {style.summary && <p>{style.summary}</p>}
      {style.traits.length > 0 && (
        <div className="traits">
          {style.traits.map((t) => (
            <span className="trait" key={t.key}>
              {t.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
