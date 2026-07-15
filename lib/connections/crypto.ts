import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { AppError } from "@/lib/errors";

/**
 * Symmetric encryption for third-party connection secrets (e.g. a Notion
 * integration token) stored at rest. AES-256-GCM with a key derived from the
 * CONNECTIONS_ENC_KEY env var. The plaintext token never leaves the server and
 * is never returned to the client — only encrypted blobs are persisted.
 *
 * Blob format: base64(iv).base64(authTag).base64(ciphertext)
 */

function key(): Buffer {
  const raw = process.env.CONNECTIONS_ENC_KEY;
  if (!raw) {
    throw new AppError("internal", "Connections aren't configured yet.", {
      internal: "CONNECTIONS_ENC_KEY is not set",
    });
  }
  // Derive a fixed 32-byte key from whatever string is provided, so the env
  // value can be any sufficiently-random secret.
  return createHash("sha256").update(raw, "utf8").digest();
}

export function connectionsConfigured(): boolean {
  return Boolean(process.env.CONNECTIONS_ENC_KEY);
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(".");
}

export function decryptSecret(blob: string): string {
  const [ivb, tagb, ctb] = blob.split(".");
  if (!ivb || !tagb || !ctb) {
    throw new AppError("internal", "Stored connection is corrupt.", {
      internal: "malformed secret blob",
    });
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivb, "base64"));
  decipher.setAuthTag(Buffer.from(tagb, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctb, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
