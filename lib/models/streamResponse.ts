import { getAnthropic } from "./_anthropic";
import type { GenerateResponseInput } from "./types";

const DEFAULT_MODEL = "claude-opus-4-7";
const DEFAULT_MAX_TOKENS = 2048;

export type StreamEvent =
  | { type: "delta"; text: string }
  | {
      type: "complete";
      content: string;
      model: string;
      inputTokens: number;
      outputTokens: number;
    };

/**
 * Stream a Claude response as text deltas, ending with a `complete` event
 * carrying the full accumulated text and token usage. Provider-specific
 * stream semantics never leak past this wrapper.
 */
export async function* streamResponse(
  input: GenerateResponseInput,
): AsyncGenerator<StreamEvent> {
  const model = input.model ?? DEFAULT_MODEL;
  const stream = getAnthropic().messages.stream({
    model,
    system: input.system,
    messages: input.messages,
    max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: input.temperature,
    metadata: input.metadata
      ? { user_id: String(input.metadata.memberId ?? "") }
      : undefined,
  });

  let accumulated = "";
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      const text = event.delta.text;
      accumulated += text;
      yield { type: "delta", text };
    }
  }

  const final = await stream.finalMessage();
  yield {
    type: "complete",
    content: accumulated,
    model: final.model,
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
  };
}
