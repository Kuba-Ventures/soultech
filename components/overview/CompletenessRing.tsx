"use client";

import { useEffect, useState } from "react";

const R = 38;
const C = 2 * Math.PI * R; // circumference

/** Amber completeness ring that animates up to `percent` on mount. */
export function CompletenessRing({ percent }: { percent: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(percent), 80);
    return () => clearTimeout(t);
  }, [percent]);

  return (
    <div className="ring">
      <svg width="88" height="88">
        <circle
          cx="44"
          cy="44"
          r={R}
          fill="none"
          stroke="rgba(245,238,227,.08)"
          strokeWidth="6"
        />
        <circle
          className="fg"
          cx="44"
          cy="44"
          r={R}
          fill="none"
          stroke="var(--amber)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - shown / 100)}
          style={{ filter: "drop-shadow(0 0 6px rgba(240,168,76,.6))" }}
        />
      </svg>
      <div className="pct">
        <span>{percent}%</span>
        <small>KNOWN</small>
      </div>
    </div>
  );
}
