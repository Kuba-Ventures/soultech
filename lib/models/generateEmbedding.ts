import type { GenerateEmbeddingOutput } from "./types";

/**
 * Voyage AI does not ship an official Node SDK, so we call the REST endpoint
 * directly. If we ever switch to OpenAI text-embedding-3-large, the signature
 * stays the same: only this file changes.
 *
 * Retries with exponential backoff on 429 (rate-limited) and 5xx responses,
 * honoring a Retry-After header when present. Total attempts: 5.
 */

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const DEFAULT_MODEL = "voyage-3-large";
const EXPECTED_DIMENSIONS = 1024;
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 800;

type VoyageResponse = {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateEmbedding(
  text: string,
  opts?: { model?: string; inputType?: "document" | "query" },
): Promise<GenerateEmbeddingOutput> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "VOYAGE_API_KEY is not set. Required for generateEmbedding().",
    );
  }
  const model = opts?.model ?? DEFAULT_MODEL;
  const body = JSON.stringify({
    input: [text],
    model,
    input_type: opts?.inputType ?? "document",
    output_dimension: EXPECTED_DIMENSIONS,
  });

  let lastDetail = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(VOYAGE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (res.ok) {
      const parsed = (await res.json()) as VoyageResponse;
      const embedding = parsed.data[0]?.embedding;
      if (!embedding || embedding.length !== EXPECTED_DIMENSIONS) {
        throw new Error(
          `Voyage returned embedding with wrong shape: got ${embedding?.length ?? 0}, expected ${EXPECTED_DIMENSIONS}`,
        );
      }
      return {
        embedding,
        model: parsed.model,
        dimensions: embedding.length,
      };
    }

    lastDetail = await res.text().catch(() => "");
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) {
      throw new Error(
        `Voyage embedding request failed (${res.status}): ${lastDetail.slice(0, 200)}`,
      );
    }

    const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
    const backoff =
      retryAfter ?? BASE_BACKOFF_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 200);
    await sleep(backoff);
  }

  throw new Error(`Voyage embedding failed after ${MAX_ATTEMPTS} attempts: ${lastDetail.slice(0, 200)}`);
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}
