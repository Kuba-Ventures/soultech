/**
 * Shared types for the model abstraction layer.
 *
 * Every call site for an LLM, embedding model, or transcription service goes
 * through these wrappers. This file owns the public surface; provider-specific
 * details stay inside the individual wrapper files.
 */

export type ModelMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

export type GenerateResponseInput = {
  system: string;
  messages: ModelMessage[];
  /** Override the default model id (e.g. for cheap Haiku passes). */
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Optional metadata for logging / tracing. */
  metadata?: Record<string, unknown>;
};

export type GenerateResponseOutput = {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

export type GenerateEmbeddingOutput = {
  embedding: number[];
  model: string;
  dimensions: number;
};

export type TranscribeInput = {
  /** Public-or-presigned URL Deepgram can fetch, OR raw bytes. */
  source: { kind: "url"; url: string } | { kind: "bytes"; data: Buffer; mimeType: string };
  /** Hint Deepgram about language; defaults to 'en'. */
  language?: string;
  /** Enable speaker diarization (separate channels by speaker). */
  diarize?: boolean;
};

export type TranscribeSegment = {
  text: string;
  start: number;
  end: number;
  speaker?: number;
};

export type TranscribeOutput = {
  fullText: string;
  segments: TranscribeSegment[];
  model: string;
  durationSeconds: number;
};
