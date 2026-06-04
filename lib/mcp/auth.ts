import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { toolConnections, type ToolConnection } from "@/lib/db/schema";

/**
 * Resolve an MCP connection by its capability token. The token IS the auth for
 * the MCP server (clients carry no Clerk session), so this is the single trust
 * boundary: an active connection or nothing. Lookup is by sha256(token) hash.
 */
export async function resolveConnection(
  token: string | undefined,
): Promise<ToolConnection | null> {
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const db = getDb();
  const rows = await db
    .select()
    .from(toolConnections)
    .where(
      and(
        eq(toolConnections.tokenHash, tokenHash),
        eq(toolConnections.status, "active"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Best-effort "last used" stamp; never blocks the request. */
export async function touchConnection(connectionId: string): Promise<void> {
  try {
    await getDb()
      .update(toolConnections)
      .set({ lastSyncedAt: new Date() })
      .where(eq(toolConnections.id, connectionId));
  } catch {
    /* non-critical */
  }
}
