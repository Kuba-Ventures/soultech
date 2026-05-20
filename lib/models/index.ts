/**
 * Single import surface for every model call in the app.
 *
 * Rule: nothing outside lib/models/ imports from provider SDKs directly. If
 * you find yourself reaching for `@anthropic-ai/sdk` or `@deepgram/sdk` in a
 * route handler or server action, add a method here instead.
 */

export { generateResponse } from "./generateResponse";
export { generateEmbedding } from "./generateEmbedding";
export { transcribe } from "./transcribe";
export type {
  ModelMessage,
  GenerateResponseInput,
  GenerateResponseOutput,
  GenerateEmbeddingOutput,
  TranscribeInput,
  TranscribeOutput,
  TranscribeSegment,
} from "./types";
