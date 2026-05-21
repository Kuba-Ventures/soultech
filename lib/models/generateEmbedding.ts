import type { GenerateEmbeddingOutput } from "./types";

/**
 * Voyage AI does not ship an official Node SDK, so we call the REST endpoint
 * directly. If we ever switch to OpenAI text-embedding-3-large, the signature
 * stays the same: only this file changes.
 */

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const DEFAULT_MODEL = "voyage-3-large";
const EXPECTED_DIMENSIONS = 1024;

type VoyageResponse = {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
};

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

  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: [text],
      model,
      input_type: opts?.inputType ?? "document",
      output_dimension: EXPECTED_DIMENSIONS,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Voyage embedding request failed (${res.status}): ${errText.slice(0, 200)}`,
    );
  }

  const body = (await res.json()) as VoyageResponse;
  const embedding = body.data[0]?.embedding;
  if (!embedding || embedding.length !== EXPECTED_DIMENSIONS) {
    throw new Error(
      `Voyage returned embedding with wrong shape: got ${embedding?.length ?? 0}, expected ${EXPECTED_DIMENSIONS}`,
    );
  }

  return {
    embedding,
    model: body.model,
    dimensions: embedding.length,
  };
}
