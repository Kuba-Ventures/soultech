export type UploadResult =
  | { ok: true; sourceId: string; memoryCount: number; kind: string }
  | { ok: false; error: string };
