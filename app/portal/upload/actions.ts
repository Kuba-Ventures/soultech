"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/db/members";
import { createSource, markSourceFailed, markSourceReady } from "@/lib/db/sources";
import { createMemory } from "@/lib/db/memories";
import { logAudit } from "@/lib/audit";
import { classifyUpload, MAX_UPLOAD_BYTES } from "@/lib/uploads/classify";
import { chunkText } from "@/lib/uploads/chunk";
import { summarizeChunk } from "@/lib/prompts/summarize";
import { transcribe } from "@/lib/models/transcribe";
import { AppError, isAppError } from "@/lib/errors";
import { enforceUploadLimit } from "@/lib/limits";
import type { UploadResult } from "./types";

export async function processUpload(formData: FormData): Promise<UploadResult> {
  let sourceId: string | null = null;
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new AppError("invalid_input", "Choose a file to upload.");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new AppError("invalid_input", "File is over 25 MB.");
    }

    const kind = classifyUpload(file.name, file.type);
    if (!kind) {
      throw new AppError(
        "invalid_input",
        "Unsupported file type. Use .txt, .md, .pdf, .mp3, .m4a, .wav, or .webm.",
      );
    }

    const member = await getCurrentMember();
    await enforceUploadLimit(member.id);
    const sourceType = kind === "audio" ? "upload_audio" : "upload_doc";

    const source = await createSource({
      memberId: member.id,
      sourceType,
      originalFilename: file.name,
      storageKey: null, // Raw bytes not persisted yet; see OPEN_QUESTIONS.md.
      status: "processing",
    });
    sourceId = source.id;

    let chunks: string[];
    if (kind === "text") {
      chunks = chunkText(await file.text());
    } else if (kind === "pdf") {
      const buf = Buffer.from(await file.arrayBuffer());
      // Dynamic import — pdf-parse v2's pdfjs worker setup is heavy and we
      // don't want it in the cold start of every server bundle.
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buf });
      try {
        const result = await parser.getText();
        chunks = chunkText(result.text ?? "");
      } finally {
        await parser.destroy();
      }
    } else {
      const buf = Buffer.from(await file.arrayBuffer());
      const result = await transcribe({
        source: {
          kind: "bytes",
          data: buf,
          mimeType: file.type || "audio/mpeg",
        },
        diarize: true,
      });
      chunks = result.segments.map((s) => s.text.trim()).filter(Boolean);
      if (chunks.length === 0 && result.fullText) {
        chunks = chunkText(result.fullText);
      }
    }

    if (chunks.length === 0) {
      throw new AppError(
        "invalid_input",
        "No usable text found in the file. Try another upload.",
      );
    }

    let written = 0;
    for (const content of chunks) {
      const summary = await summarizeChunk(content);
      await createMemory({
        memberId: member.id,
        sourceType,
        sourceId: source.id,
        content,
        contentSummary: summary,
      });
      written += 1;
    }

    await markSourceReady(source.id);
    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "source.processed",
      targetType: "source",
      targetId: source.id,
      details: {
        filename: file.name,
        kind,
        bytes: file.size,
        memories: written,
      },
    });

    revalidatePath("/portal/memories");
    revalidatePath("/portal/upload");
    return { ok: true, sourceId: source.id, memoryCount: written, kind };
  } catch (err) {
    if (sourceId) {
      try {
        await markSourceFailed(sourceId);
      } catch {
        /* swallow secondary failure */
      }
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[upload.processUpload]", err);
    return { ok: false, error: `Upload failed: ${detail.slice(0, 240)}` };
  }
}
