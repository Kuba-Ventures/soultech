"use client";

import { useState } from "react";

/**
 * The MCP connector card: the member's per-user two-way endpoint URL, copyable.
 * The token is a real per-connection capability; the live server that answers
 * it lands in Phase 3. The displayed URL masks the tail of the token.
 */
export function EndpointCard({
  url,
  displayUrl,
}: {
  url: string;
  displayUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    try {
      navigator.clipboard?.writeText(url);
    } catch {
      /* clipboard unavailable; no-op */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="mcp rise">
      <div className="lab">◆ One endpoint, every tool that speaks MCP</div>
      <h3>Add it once. It reads what you allow and writes back as you work.</h3>
      <div className="d">
        Drop this into Claude, Claude Code, Cursor, or anything with connector
        support. Most personal-memory tools only let tools read you. Yours is
        two-way.
      </div>
      <div className="urlbox">
        <code>{displayUrl}</code>
        <span className="cp" role="button" tabIndex={0} onClick={copy}>
          {copied ? "Copied ✓" : "Copy"}
        </span>
      </div>
      <div className="travels">
        <span className="tv">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12l4 4 10-10" />
          </svg>
          Reads: facts, plans, learning style, voice
        </span>
        <span className="tv">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12l4 4 10-10" />
          </svg>
          Writes: new memories, track progress
        </span>
      </div>
    </div>
  );
}
