import { AppError } from "@/lib/errors";
import { classifyUpload, MAX_UPLOAD_BYTES } from "@/lib/uploads/classify";

/**
 * Extract plain text from an uploaded document for profile parsing.
 *
 * Supports the document kinds the profile can learn from: plain text / markdown
 * and PDF. Audio is intentionally out of scope here (it needs transcription and
 * belongs to a different pipeline). Mirrors the extraction approach in
 * app/portal/upload/actions.ts so behavior stays consistent.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size === 0) {
    throw new AppError("invalid_input", "That file is empty.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError("invalid_input", "File is over 25 MB.");
  }

  const kind = classifyUpload(file.name, file.type);
  if (kind === "text") {
    return file.text();
  }
  if (kind === "pdf") {
    const buf = Buffer.from(await file.arrayBuffer());
    // Dynamic import: pdf-parse v2's pdfjs worker setup is heavy; keep it out
    // of the cold-start bundle.
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buf });
    try {
      const result = await parser.getText();
      return result.text ?? "";
    } finally {
      await parser.destroy();
    }
  }

  throw new AppError(
    "invalid_input",
    "Upload a .txt, .md, or .pdf document. (Audio and other formats aren't supported here yet.)",
  );
}
