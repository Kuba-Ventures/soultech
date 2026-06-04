"use client";

import { useState } from "react";
import { onActivateKey } from "@/lib/ui/onActivateKey";
import { BrandIcon } from "@/components/ui/BrandIcon";

type Connector = {
  key: string;
  brand: string;
  name: string;
  badge: string;
  badgeColor: string;
  blurb: string;
  cta: string;
  done: string;
  featured?: boolean;
};

const CONNECTORS: Connector[] = [
  { key: "claude", brand: "claude", name: "Claude", badge: "C", badgeColor: "#d97a4a", blurb: "Answers with your context and learns you back.", cta: "Add to Claude", done: "✓ Added", featured: true },
  { key: "cursor", brand: "cursor", name: "Claude Code / Cursor", badge: "⌘", badgeColor: "#3a3a40", blurb: "Your terminal and editor know your stack and prompts.", cta: "Connect", done: "✓ Connected" },
  { key: "chatgpt", brand: "chatgpt", name: "ChatGPT", badge: "O", badgeColor: "#10a37f", blurb: "Carry your profile in via custom connector.", cta: "Connect", done: "✓ Connected" },
  { key: "notion", brand: "notion", name: "Notion", badge: "N", badgeColor: "#2f2f2f", blurb: "Drafts written in your voice.", cta: "Connect", done: "✓ Connected" },
  { key: "raycast", brand: "raycast", name: "Raycast", badge: "R", badgeColor: "#ff6363", blurb: "Summon your clone from anywhere on the Mac.", cta: "Connect", done: "✓ Connected" },
  { key: "api", brand: "api", name: "API / webhook", badge: "{ }", badgeColor: "#4aa6c9", blurb: "Build your own surface on top of you.", cta: "Get keys", done: "✓ Issued" },
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
              <span className="lg" style={{ background: c.badgeColor, color: "#fff" }}>
                <BrandIcon brand={c.brand} fallback={c.badge} />
              </span>
              <span className="cn">{c.name}</span>
            </div>
            <span className="te">{c.blurb}</span>
            <span
              className="cta"
              role="button"
              tabIndex={0}
              onClick={() => setLinked((p) => ({ ...p, [c.key]: true }))}
              onKeyDown={onActivateKey(() =>
                setLinked((p) => ({ ...p, [c.key]: true })),
              )}
            >
              {isLinked ? c.done : c.cta}
            </span>
          </div>
        );
      })}
    </div>
  );
}
