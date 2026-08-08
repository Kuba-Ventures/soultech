import { describe, it, expect } from "vitest";
import {
  AI_PASTE_SOURCES,
  aiSourceLabel,
  isAiSourceKey,
  type AiSourceKey,
} from "./aiSources";

describe("aiSources", () => {
  it("offers Claude, ChatGPT, Gemini, and Other in that order", () => {
    expect(AI_PASTE_SOURCES.map((s) => s.key)).toEqual([
      "claude",
      "chatgpt",
      "gemini",
      "other",
    ]);
  });

  it("accepts every picker key", () => {
    for (const s of AI_PASTE_SOURCES) {
      expect(isAiSourceKey(s.key)).toBe(true);
    }
  });

  it("rejects unknown, empty, and non-string values", () => {
    expect(isAiSourceKey("openai")).toBe(false);
    expect(isAiSourceKey("ai")).toBe(false);
    expect(isAiSourceKey("")).toBe(false);
    expect(isAiSourceKey(undefined)).toBe(false);
    expect(isAiSourceKey(null)).toBe(false);
    expect(isAiSourceKey(42)).toBe(false);
  });

  it("labels each provider by name, with 'Other AI' for the catch-all", () => {
    expect(aiSourceLabel("claude")).toBe("Claude");
    expect(aiSourceLabel("chatgpt")).toBe("ChatGPT");
    expect(aiSourceLabel("gemini")).toBe("Gemini");
    expect(aiSourceLabel("other")).toBe("Other AI");
  });

  it("gives every source key a non-empty label", () => {
    for (const s of AI_PASTE_SOURCES) {
      expect(aiSourceLabel(s.key as AiSourceKey).length).toBeGreaterThan(0);
    }
  });
});
