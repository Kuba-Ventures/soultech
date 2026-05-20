import Anthropic from "@anthropic-ai/sdk";
import type { GenerateResponseInput, GenerateResponseOutput } from "./types";

const DEFAULT_MODEL = "claude-opus-4-7";
const DEFAULT_MAX_TOKENS = 2048;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Required for generateResponse().",
    );
  }
  client = new Anthropic({ apiKey });
  return client;
}

export async function generateResponse(
  input: GenerateResponseInput,
): Promise<GenerateResponseOutput> {
  const model = input.model ?? DEFAULT_MODEL;
  const res = await getClient().messages.create({
    model,
    system: input.system,
    messages: input.messages,
    max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: input.temperature,
    metadata: input.metadata ? { user_id: String(input.metadata.memberId ?? "") } : undefined,
  });

  const content = res.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return {
    content,
    model: res.model,
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
  };
}
