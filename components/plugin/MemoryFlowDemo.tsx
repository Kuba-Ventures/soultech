"use client";

import { useState, useTransition } from "react";
import { Flywheel } from "./Flywheel";
import { watchMemoryFlow } from "@/app/(app)/plugin/actions";

/**
 * The flywheel + "watch a memory flow" control. Clicking fires the server
 * action that advances a real track and toasts the loop closing. The bump
 * persists and shows up on /learn.
 */
export function MemoryFlowDemo() {
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const res = await watchMemoryFlow();
      setToast(res.toast);
      window.clearTimeout((window as { _stTT?: number })._stTT);
      (window as { _stTT?: number })._stTT = window.setTimeout(
        () => setToast(null),
        3200,
      );
    });
  }

  return (
    <>
      <div className="fwwrap rise">
        <Flywheel />
        <div className="fwtext">
          <h3>
            Watch a memory <em>close the loop.</em>
          </h3>
          <p>
            You ship something in Claude. Soultech captures what it taught the
            model about you, files it as a memory, and nudges the matching
            learning track forward, automatically.
          </p>
          <button
            type="button"
            className="btn cool"
            onClick={run}
            disabled={pending}
          >
            {pending ? "Writing back…" : "▶ Watch a memory flow"}
          </button>
        </div>
      </div>

      <div className={`toast${toast ? " show" : ""}`} aria-live="polite">
        <span className="ti">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12l4 4 10-10" />
          </svg>
        </span>
        <span>{toast}</span>
      </div>
    </>
  );
}
