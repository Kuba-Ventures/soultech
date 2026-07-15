import { describe, it, expect } from "vitest";
import {
  CATEGORIES,
  CATEGORY_KEYS,
  SECTIONS,
  categoryLabel,
  isCategoryKey,
  primaryCategoryForSection,
  sectionForCategory,
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

  it("gives every category a label and a blurb", () => {
    for (const c of CATEGORIES) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.blurb.length).toBeGreaterThan(0);
    }
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
