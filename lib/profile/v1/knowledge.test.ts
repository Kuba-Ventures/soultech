import { describe, it, expect } from "vitest";
import { computeKnowledge, suggestImprovements } from "./knowledge";
import { CATEGORY_KEYS } from "./types";
import type { CategoryKey, ProfileItem, SourceEntry } from "./types";

let seq = 0;
function item(category: CategoryKey, content = "x"): ProfileItem {
  return { id: `i${seq++}`, category, content, source: "test" };
}

/** `n` items spread one-per-category across the first `n` categories. */
function itemsAcross(n: number): ProfileItem[] {
  return CATEGORY_KEYS.slice(0, n).map((k) => item(k));
}

/** Fill every category to at least `perCategory` items. */
function fullProfile(perCategory: number): ProfileItem[] {
  return CATEGORY_KEYS.flatMap((k) =>
    Array.from({ length: perCategory }, () => item(k)),
  );
}

function source(kind: SourceEntry["kind"]): SourceEntry {
  return { id: `s${seq++}`, kind, provider: kind, label: kind, addedAt: "2026-07-17" };
}

describe("computeKnowledge", () => {
  it("is 0% for an empty profile", () => {
    expect(computeKnowledge([]).percent).toBe(0);
  });

  it("scores a single item as roughly one category's worth (~6%)", () => {
    // 0.55 depth / 10 categories = 5.5% → rounds to 6.
    expect(computeKnowledge([item("values_and_criteria")]).percent).toBe(6);
  });

  it("reaches exactly 100% when every category has 3+ items", () => {
    expect(computeKnowledge(fullProfile(3)).percent).toBe(100);
  });

  it("caps a flooded category at its 3-item depth", () => {
    const flooded = Array.from({ length: 25 }, () => item("recurring_topics"));
    // One maxed category out of ten = 10%.
    expect(computeKnowledge(flooded).percent).toBe(10);
    const strength = computeKnowledge(flooded).byCategory.find(
      (c) => c.key === "recurring_topics",
    );
    expect(strength?.count).toBe(25);
    expect(strength?.score).toBe(1);
  });

  it("rewards breadth over depth", () => {
    const broad = itemsAcross(6); // six categories, one item each
    const deep = fullProfile(3).filter((_, i) => i < 6); // two categories, deep
    expect(computeKnowledge(broad).percent).toBeGreaterThan(
      computeKnowledge(deep).percent,
    );
  });

  it("returns a breakdown for all ten categories in canonical order", () => {
    const { byCategory } = computeKnowledge([]);
    expect(byCategory.map((c) => c.key)).toEqual([...CATEGORY_KEYS]);
  });
});

describe("suggestImprovements", () => {
  it("targets the thinnest categories first", () => {
    // Everything covered except two thin ones.
    const items = [
      ...fullProfile(3).filter(
        (it) => it.category !== "values_and_criteria" && it.category !== "emotional_cues",
      ),
    ];
    const suggestions = suggestImprovements(items, [source("connection")]);
    expect(suggestions.map((s) => s.category)).toEqual([
      "values_and_criteria",
      "emotional_cues",
    ]);
  });

  it("adds a Notion nudge only when no connection source exists", () => {
    const items = fullProfile(3).slice(0, 2); // leaves room for a diversity nudge
    const withoutConn = suggestImprovements(items, [source("upload")]);
    expect(withoutConn.some((s) => /Notion/.test(s.label))).toBe(true);

    const withConn = suggestImprovements(items, [source("connection")]);
    expect(withConn.some((s) => /Notion/.test(s.label))).toBe(false);
  });

  it("never returns more than three suggestions", () => {
    expect(suggestImprovements([], []).length).toBeLessThanOrEqual(3);
  });

  it("returns nothing to improve for a fully-covered profile", () => {
    expect(suggestImprovements(fullProfile(3), [source("connection")])).toEqual([]);
  });

  it("links every suggestion to the Sources manager", () => {
    for (const s of suggestImprovements([], [])) {
      expect(s.href).toBe("/import");
    }
  });
});
