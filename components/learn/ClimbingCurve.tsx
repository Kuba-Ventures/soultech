/**
 * The signature "climbing curve" hero on /learn. The cyan line draws itself in
 * on mount (SVG stroke-dashoffset animation in globals.css), landing on a
 * glowing endpoint. Amber italics carry the "as you" emphasis.
 */
export function ClimbingCurve() {
  return (
    <div className="chero rise">
      <svg className="cv" viewBox="0 0 320 200" preserveAspectRatio="none">
        <g className="grid">
          <line x1="0" y1="50" x2="320" y2="50" />
          <line x1="0" y1="100" x2="320" y2="100" />
          <line x1="0" y1="150" x2="320" y2="150" />
        </g>
        <path className="ln" d="M8,184 C 70,178 110,150 150,120 S 240,55 312,18" />
        <circle
          className="end"
          cx="312"
          cy="18"
          r="6"
          fill="var(--cool)"
          style={{ filter: "drop-shadow(0 0 8px var(--cool))" }}
        />
      </svg>
      <div className="ct">
        <h1 className="title" style={{ fontSize: "42px" }}>
          Climb the curve <em>as you.</em>
        </h1>
        <div className="lede" style={{ marginBottom: 0 }}>
          The whole point of Soultech. Your clone learns how{" "}
          <em style={{ fontStyle: "italic", color: "var(--amber-soft)" }}>you</em>{" "}
          learn, then feeds you the next rep in that style, inside the tools
          where you already work.
        </div>
      </div>
    </div>
  );
}
