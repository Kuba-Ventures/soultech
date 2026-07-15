import { del, put } from "@vercel/blob";
import { AppError } from "@/lib/errors";

/**
 * Optional at-rest storage for the raw files a member uploads as sources, on
 * Vercel Blob. Gated behind BLOB_READ_WRITE_TOKEN: if it isn't set, uploads
 * still work (we keep the extracted profile items) but the raw bytes aren't
 * retained.
 *
 * Note: Vercel Blob serves from public URLs — there is no per-request auth on
 * the bytes. The path includes the memberId and a random suffix so URLs are
 * unguessable, which is the protection. Access-controlled storage (signed URLs)
 * is the hardening follow-up flagged for the security pass.
 */

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function putUserFile(
  memberId: string,
  file: File,
): Promise<{ url: string } | null> {
  if (!blobConfigured()) return null;
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
  try {
    const blob = await put(`sources/${memberId}/${safe}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type || "application/octet-stream",
    });
    return { url: blob.url };
  } catch (err) {
    console.error("[uploads.putUserFile]", err);
    throw new AppError("internal", "Couldn't store that file. Try again.");
  }
}

export async function deleteUserFile(url: string | undefined): Promise<void> {
  if (!blobConfigured() || !url) return;
  try {
    await del(url);
  } catch (err) {
    // Best-effort: a dangling blob is not worth failing the removal over.
    console.error("[uploads.deleteUserFile]", err);
  }
}
