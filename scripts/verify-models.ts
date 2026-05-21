/**
 * Smoke test: confirms generateResponse() and generateEmbedding() work end to end
 * with the keys in .env.local. Run with:
 *   node --env-file=.env.local --experimental-strip-types scripts/verify-models.ts
 */

import { generateResponse } from "../lib/models/generateResponse.ts";
import { generateEmbedding } from "../lib/models/generateEmbedding.ts";

async function main() {
  console.log("Testing generateResponse...");
  const resp = await generateResponse({
    system: "Reply with exactly the word OK and nothing else.",
    messages: [{ role: "user", content: "ping" }],
    maxTokens: 8,
  });
  console.log(`  model=${resp.model} content="${resp.content.trim()}" tokens=${resp.inputTokens}/${resp.outputTokens}`);

  console.log("Testing generateEmbedding...");
  const emb = await generateEmbedding("hello world");
  console.log(`  model=${emb.model} dims=${emb.dimensions} first3=[${emb.embedding.slice(0, 3).map((n) => n.toFixed(4)).join(", ")}]`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
