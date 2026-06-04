import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./client";
import {
  toolConnections,
  type ScopeMatrix,
  type ToolConnection,
} from "./schema";

/**
 * Default scope for a freshly created connection: normal categories readable,
 * nothing writable, sensitive categories fully off. Write-back and sensitive
 * access are opt-in (Phase 3 enforces this server-side).
 */
export const DEFAULT_SCOPE_MATRIX: ScopeMatrix = {
  profile: { read: true, write: false },
  learning_style: { read: true, write: false },
  memories: { read: true, write: false },
  tracks: { read: true, write: false },
  health: { read: false, write: false },
  financial: { read: false, write: false },
  location: { read: false, write: false },
};

function newToken(): { token: string; tokenHash: string } {
  const token = randomBytes(24).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

/**
 * The member's primary connection backs the copyable endpoint URL on /plugin.
 * Created on first visit. Per-tool connections (Claude vs Cursor vs ...) and
 * scope persistence land in Phase 3 alongside the live MCP server.
 */
export async function getOrCreatePrimaryConnection(
  memberId: string,
): Promise<ToolConnection> {
  const db = getDb();
  const existing = await db
    .select()
    .from(toolConnections)
    .where(
      and(
        eq(toolConnections.memberId, memberId),
        eq(toolConnections.status, "active"),
      ),
    )
    .orderBy(desc(toolConnections.createdAt))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const { token, tokenHash } = newToken();
  const inserted = await db
    .insert(toolConnections)
    .values({
      memberId,
      tool: "api",
      label: "Personal MCP endpoint",
      token,
      tokenHash,
      scopeMatrix: DEFAULT_SCOPE_MATRIX,
      canWriteBack: false,
    })
    .returning();
  return inserted[0];
}

export async function listConnections(
  memberId: string,
): Promise<ToolConnection[]> {
  const db = getDb();
  return db
    .select()
    .from(toolConnections)
    .where(eq(toolConnections.memberId, memberId))
    .orderBy(desc(toolConnections.createdAt));
}

/** Build the per-user MCP endpoint URL for a connection token. */
export function mcpEndpointUrl(token: string, origin?: string): string {
  const base =
    origin ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return `${base}/api/mcp/${token}`;
}

/** Rotate a connection's token (invalidates the old endpoint URL). */
export async function rotateConnectionToken(
  memberId: string,
  connectionId: string,
): Promise<ToolConnection | null> {
  const db = getDb();
  const { token, tokenHash } = newToken();
  const updated = await db
    .update(toolConnections)
    .set({ token, tokenHash })
    .where(
      and(
        eq(toolConnections.id, connectionId),
        eq(toolConnections.memberId, memberId),
      ),
    )
    .returning();
  return updated[0] ?? null;
}
