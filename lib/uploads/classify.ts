export type UploadKind = "text" | "pdf" | "audio";

const TEXT_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/x-markdown",
]);

const PDF_MIMES = new Set(["application/pdf"]);

const AUDIO_MIMES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/webm",
]);

const EXT_MAP: Record<string, UploadKind> = {
  txt: "text",
  md: "text",
  markdown: "text",
  pdf: "pdf",
  mp3: "audio",
  m4a: "audio",
  wav: "audio",
  webm: "audio",
};

export function classifyUpload(filename: string, mime: string): UploadKind | null {
  const lowerMime = mime.toLowerCase();
  if (TEXT_MIMES.has(lowerMime)) return "text";
  if (PDF_MIMES.has(lowerMime)) return "pdf";
  if (AUDIO_MIMES.has(lowerMime) || lowerMime.startsWith("audio/")) return "audio";

  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && EXT_MAP[ext]) return EXT_MAP[ext];
  return null;
}

export const ACCEPTED_EXTENSIONS = ".txt,.md,.markdown,.pdf,.mp3,.m4a,.wav,.webm";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB
