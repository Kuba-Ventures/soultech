import { describe, it, expect } from "vitest";
import {
  CATEGORIES,
  CATEGORY_KEYS,
  SECTIONS,
  categoryLabel,
  categoryTag,
  isCategoryKey,
  primaryCategoryForSection,
  sectionForCategory,
  splitLead,
} from "./types";

// Pure-logic tests for the canonical schema surface. These guard the ten-
// category contract every downstream feature depends on.
describe("profile v1 category schema", () => {
  it("defines exactly ten canonical categories", () => {
    expect(CATEGORY_KEYS).toHaveLength(10);
  });

  it("keeps CATEGORIES and CATEGORY_KEYS in sync and in order", () => {
    expect(CATEGORIES.map((c) => c.key)).toEqual([...CATEGORY_KEYS]);
  });

  it("has no duplicate category keys", () => {
    expect(new Set(CATEGORY_KEYS).size).toBe(CATEGORY_KEYS.length);
  });

  it("gives every category a label, tag, and a blurb", () => {
    for (const c of CATEGORIES) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.tag.length).toBeGreaterThan(0);
      expect(c.blurb.length).toBeGreaterThan(0);
    }
  });
});

describe("categoryTag", () => {
  it("returns the short group tag for a known key", () => {
    expect(categoryTag("communication_register")).toBe("Register");
    expect(categoryTag("engagement_style")).toBe("Engagement");
  });
});

describe("splitLead", () => {
  it("uses a stored lead when it's a genuine prefix of the content", () => {
    const { lead, rest } = splitLead({
      content: "You open with the task itself, giving background only when it changes the answer.",
      lead: "You open with the task itself",
    });
    expect(lead).toBe("You open with the task itself");
    expect(rest).toBe(", giving background only when it changes the answer.");
  });

  it("ignores a stored lead that isn't a real prefix and derives one instead", () => {
    const { lead, rest } = splitLead({
      content: "You default to short, compressed sentences, often skipping capitalization.",
      lead: "Compressed sentences", // paraphrase, not a prefix
    });
    expect(lead).toBe("You default to short");
    expect(rest).toBe(", compressed sentences, often skipping capitalization.");
  });

  it("derives from the first clause when no lead is stored", () => {
    const { lead, rest } = splitLead({
      content: "You favor blunt imperative openers, with little preamble.",
    });
    expect(lead).toBe("You favor blunt imperative openers");
    expect(rest).toBe(", with little preamble.");
  });

  it("falls back to the first words when the first clause is too long", () => {
    const content =
      "You update your question with new evidence after receiving an initial answer instead of front-loading detail.";
    const { lead, rest } = splitLead({ content });
    expect(lead).toBe("You update your question with new evidence");
    expect(lead + rest).toBe(content);
  });

  it("always reconstructs the full content", () => {
    const content = "You write the way you speak: lowercase, contractions, fragments.";
    const { lead, rest } = splitLead({ content });
    expect(lead + rest).toBe(content);
  });
});

describe("isCategoryKey", () => {
  it("accepts every canonical key", () => {
    for (const k of CATEGORY_KEYS) expect(isCategoryKey(k)).toBe(true);
  });

  it("rejects unknown strings and non-strings", () => {
    expect(isCategoryKey("communication")).toBe(false);
    expect(isCategoryKey("")).toBe(false);
    expect(isCategoryKey(null)).toBe(false);
    expect(isCategoryKey(3)).toBe(false);
  });
});

describe("categoryLabel", () => {
  it("returns the human label for a known key", () => {
    expect(categoryLabel("communication_register")).toBe("Communication register");
    expect(categoryLabel("emotional_cues")).toBe("Emotional & tonal cues");
  });
});

describe("section mapping", () => {
  it("covers every category exactly once across sections", () => {
    const mapped = SECTIONS.flatMap((s) => s.categories);
    expect(mapped).toHaveLength(CATEGORY_KEYS.length);
    expect(new Set(mapped)).toEqual(new Set(CATEGORY_KEYS));
  });

  it("maps every category to a section whose category list contains it", () => {
    for (const c of CATEGORY_KEYS) {
      const key = sectionForCategory(c);
      const section = SECTIONS.find((s) => s.key === key)!;
      expect(section.categories).toContain(c);
    }
  });

  it("primaryCategoryForSection returns one of that section's categories", () => {
    for (const s of SECTIONS) {
      expect(s.categories).toContain(primaryCategoryForSection(s.key));
    }
  });
});
