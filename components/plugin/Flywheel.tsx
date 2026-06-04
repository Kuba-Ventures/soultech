/**
 * The continuously-rotating flywheel: You work in Claude/Cursor → a new memory
 * is written back → your learning ticks up → repeat. Pure CSS animation
 * (spin in globals.css). Presentational; the "watch a memory flow" control
 * lives in MemoryFlowDemo.
 */
export function Flywheel() {
  return (
    <div className="flywheel">
      <div className="fw-ring" />
      <div className="fw-spin">
        <div className="pulse" />
      </div>
      <div className="fw-center">
        <b>The loop</b>
      </div>
      <div className="fw-node n1">
        <div className="nd">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M9 7V3M15 7V3M8 7h8v4a4 4 0 0 1-8 0z" />
            <path d="M12 15v6" />
          </svg>
        </div>
        <div className="nt">
          You work in
          <br />
          Claude &amp; Cursor
        </div>
      </div>
      <div className="fw-node n2">
        <div className="nd">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        </div>
        <div className="nt">
          New memory
          <br />
          written back
        </div>
      </div>
      <div className="fw-node n3">
        <div className="nd">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 17l5-5 4 4 7-8" />
          </svg>
        </div>
        <div className="nt">
          Your learning
          <br />
          ticks up
        </div>
      </div>
    </div>
  );
}
