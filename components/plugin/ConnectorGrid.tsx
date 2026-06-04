"use client";

import { useState } from "react";

type Connector = {
  key: string;
  name: string;
  badge: string;
  badgeColor: string;
  blurb: string;
  cta: string;
  done: string;
  featured?: boolean;
};

const CONNECTORS: Connector[] = [
  { key: "claude", name: "Claude", badge: "C", badgeColor: "#d97a4a", blurb: "Answers with your context and learns you back.", cta: "Add to Claude", done: "✓ Added", featured: true },
  { key: "cursor", name: "Claude Code / Cursor", badge: "⌘", badgeColor: "#7a8a99", blurb: "Your terminal and editor know your stack and prompts.", cta: "Connect", done: "✓ Connected" },
  { key: "chatgpt", name: "ChatGPT", badge: "O", badgeColor: "#5fbd8a", blurb: "Carry your profile in via custom connector.", cta: "Connect", done: "✓ Connected" },
  { key: "notion", name: "Notion", badge: "N", badgeColor: "#cfcfcf", blurb: "Drafts written in your voice.", cta: "Connect", done: "✓ Connected" },
  { key: "raycast", name: "Raycast", badge: "R", badgeColor: "#7a5fd4", blurb: "Summon your clone from anywhere on the Mac.", cta: "Connect", done: "✓ Connected" },
  { key: "api", name: "API / webhook", badge: "{ }", badgeColor: "#4aa6c9", blurb: "Build your own surface on top of you.", cta: "Get keys", done: "✓ Issued" },
];

/**
 * The "Plug into" grid. Phase 2 is an optimistic UI shell; persisting per-tool
 * connections + scopes and the live MCP handshake land in Phase 3.
 */
export function ConnectorGrid() {
  const [linked, setLinked] = useState<Record<string, boolean>>({});

  return (
    <div className="conn rise">
      {CONNECTORS.map((c) => {
        const isLinked = linked[c.key];
        return (
          <div key={c.key} className={`c${c.featured ? " feat" : ""}${isLinked ? " linked" : ""}`}>
            <div className="top">
              <span className="lg" style={{ background: c.badgeColor }}>
                {c.badge}
              </span>
              <span className="cn">{c.name}</span>
            </div>
            <span className="te">{c.blurb}</span>
            <span
              className="cta"
              role="button"
              tabIndex={0}
              onClick={() => setLinked((p) => ({ ...p, [c.key]: true }))}
            >
              {isLinked ? c.done : c.cta}
            </span>
          </div>
        );
      })}
    </div>
  );
}
