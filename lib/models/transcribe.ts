import { DeepgramClient } from "@deepgram/sdk";
import type { TranscribeInput, TranscribeOutput, TranscribeSegment } from "./types";

const DEFAULT_MODEL = "nova-3";

let client: DeepgramClient | null = null;
function getClient(): DeepgramClient {
  if (client) return client;
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY is not set. Required for transcribe().");
  }
  // The Options type in v5 omits the apiKey field publicly, but the runtime
  // accepts it via the HeaderAuthProvider path. Cast keeps it typed at this
  // boundary without leaking `any` outward.
  client = new DeepgramClient({ apiKey } as ConstructorParameters<typeof DeepgramClient>[0]);
  return client;
}

type DeepgramParagraph = {
  speaker?: number;
  sentences: Array<{ text: string; start: number; end: number }>;
};

export async function transcribe(input: TranscribeInput): Promise<TranscribeOutput> {
  const dg = getClient();
  const baseOpts = {
    model: DEFAULT_MODEL,
    language: input.language ?? "en",
    diarize: input.diarize ?? false,
    smart_format: true,
    punctuate: true,
    paragraphs: true,
  } as const;

  const response =
    input.source.kind === "url"
      ? await dg.listen.v1.media.transcribeUrl({ ...baseOpts, url: input.source.url })
      : await dg.listen.v1.media.transcribeFile(input.source.data, baseOpts);

  if (!("results" in response) || !response.results) {
    throw new Error("Deepgram returned no results (likely async callback mode)");
  }

  const channel = response.results.channels?.[0];
  const alt = channel?.alternatives?.[0];
  if (!alt) throw new Error("Deepgram returned no alternatives");

  const paragraphs =
    (alt as unknown as { paragraphs?: { paragraphs?: DeepgramParagraph[] } })
      .paragraphs?.paragraphs ?? [];

  const segments: TranscribeSegment[] = paragraphs.flatMap((p) =>
    p.sentences.map((s) => ({
      text: s.text,
      start: s.start,
      end: s.end,
      speaker: p.speaker,
    })),
  );

  return {
    fullText: alt.transcript ?? "",
    segments,
    model: DEFAULT_MODEL,
    durationSeconds: response.metadata?.duration ?? 0,
  };
}
