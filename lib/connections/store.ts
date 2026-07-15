import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { members } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "./crypto";

/**
 * Per-member third-party connections (e.g. Notion). The encrypted token lives
 * in `members.settings.connectionsV1[provider]` — same keyed-settings pattern
 * as the v1 profile, so no migration. The token is stored as an AES-GCM blob
 * and is only ever decrypted server-side by `getConnectionToken`; it is never
 * returned to the client. Public status is a boolean + display metadata.
 */

const SETTINGS_KEY = "connectionsV1";

export type ConnectionProvider = "notion";

type StoredConnection = {
  tokenEnc: string;
  workspace?: string;
  connectedAt: string;
};

/** Client-safe view of a connection: no secret material. */
export type ConnectionStatus = {
  connected: boolean;
  workspace?: string;
  connectedAt?: string;
};

async function readSettings(memberId: string): Promise<Record<string, unknown>> {
  const db = getDb();
  const [row] = await db
    .select({ settings: members.settings })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  return (row?.settings ?? {}) as Record<string, unknown>;
}

function readConnections(
  settings: Record<string, unknown>,
): Record<string, StoredConnection> {
  const raw = settings[SETTINGS_KEY];
  return raw && typeof raw === "object" ? (raw as Record<string, StoredConnection>) : {};
}

export async function getConnectionStatus(
  memberId: string,
  provider: ConnectionProvider,
): Promise<ConnectionStatus> {
  const settings = await readSettings(memberId);
  const conn = readConnections(settings)[provider];
  if (!conn?.tokenEnc) return { connected: false };
  return { connected: true, workspace: conn.workspace, connectedAt: conn.connectedAt };
}

export async function setConnection(
  memberId: string,
  provider: ConnectionProvider,
  token: string,
  meta: { workspace?: string; connectedAt: string },
): Promise<void> {
  const db = getDb();
  const settings = await readSettings(memberId);
  const connections = readConnections(settings);
  connections[provider] = {
    tokenEnc: encryptSecret(token),
    workspace: meta.workspace,
    connectedAt: meta.connectedAt,
  };
  await db
    .update(members)
    .set({ settings: { ...settings, [SETTINGS_KEY]: connections } })
    .where(eq(members.id, memberId));
}

/** Server-only: decrypt and return the stored token, or null if not connected. */
export async function getConnectionToken(
  memberId: string,
  provider: ConnectionProvider,
): Promise<string | null> {
  const settings = await readSettings(memberId);
  const conn = readConnections(settings)[provider];
  if (!conn?.tokenEnc) return null;
  return decryptSecret(conn.tokenEnc);
}

export async function removeConnection(
  memberId: string,
  provider: ConnectionProvider,
): Promise<void> {
  const db = getDb();
  const settings = await readSettings(memberId);
  const connections = readConnections(settings);
  delete connections[provider];
  await db
    .update(members)
    .set({ settings: { ...settings, [SETTINGS_KEY]: connections } })
    .where(eq(members.id, memberId));
}
