import { describe, it, expect } from "vitest";
import { computeKnowledge, learnedSegments, suggestImprovements } from "./knowledge";
import { CATEGORY_KEYS } from "./types";
import type { CategoryKey, ProfileItem, SourceEntry, SourceKind } from "./types";

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

/** One source per given kind. */
function sourcesOf(...kinds: SourceKind[]): SourceEntry[] {
  return kinds.map((kind) => ({
    id: `s${seq++}`,
    kind,
    provider: kind,
    label: kind,
    addedAt: "2026-07-17",
  }));
}

describe("computeKnowledge — coverage component", () => {
  it("is 0% for an empty profile with no sources", () => {
    const k = computeKnowledge([], []);
    expect(k.percent).toBe(0);
    expect(k.coverage).toBe(0);
    expect(k.breadth).toBe(0);
  });

  it("reports full coverage when every category has 3+ items", () => {
    expect(computeKnowledge(fullProfile(3), sourcesOf("ai")).coverage).toBe(1);
  });

  it("caps a flooded category at its 3-item depth", () => {
    const flooded = Array.from({ length: 25 }, () => item("recurring_topics"));
    const k = computeKnowledge(flooded, sourcesOf("ai"));
    const strength = k.byCategory.find((c) => c.key === "recurring_topics");
    expect(strength?.count).toBe(25);
    expect(strength?.score).toBe(1);
    // One maxed category out of ten = 0.1 coverage.
    expect(k.coverage).toBeCloseTo(0.1, 5);
  });

  it("rewards category breadth over depth", () => {
    const broad = itemsAcross(6); // six categories, one item each
    const deep = fullProfile(3).filter((_, i) => i < 6); // two categories, deep
    expect(computeKnowledge(broad, []).coverage).toBeGreaterThan(
      computeKnowledge(deep, []).coverage,
    );
  });
});

describe("computeKnowledge — breadth component + blend", () => {
  it("gives no breadth for a single source kind", () => {
    expect(computeKnowledge(fullProfile(3), sourcesOf("ai")).breadth).toBe(0);
  });

  it("climbs breadth with each distinct kind, maxing at three", () => {
    expect(computeKnowledge([], sourcesOf("ai", "upload")).breadth).toBeCloseTo(0.5, 5);
    expect(computeKnowledge([], sourcesOf("ai", "upload", "connection")).breadth).toBe(1);
    // A fourth distinct kind doesn't push past full breadth.
    expect(
      computeKnowledge([], sourcesOf("ai", "upload", "connection", "custom")).breadth,
    ).toBe(1);
  });

  it("counts distinct kinds, not source count (two AI pastes = one kind)", () => {
    expect(computeKnowledge([], sourcesOf("ai", "ai")).breadth).toBe(0);
  });

  it("tops out at 85% on full coverage from a single source kind", () => {
    expect(computeKnowledge(fullProfile(3), sourcesOf("ai")).percent).toBe(85);
  });

  it("reaches a true 100% only with full coverage AND three source kinds", () => {
    const full = fullProfile(3);
    expect(computeKnowledge(full, sourcesOf("ai", "upload", "connection")).percent).toBe(100);
    // Coverage alone can't get there.
    expect(computeKnowledge(full, sourcesOf("ai")).percent).toBeLessThan(100);
  });
});

describe("learnedSegments", () => {
  const sum = (segs: { pct: number }[]) => segs.reduce((a, s) => a + s.pct, 0);

  it("has no slices for an empty profile", () => {
    expect(learnedSegments(computeKnowledge([], []))).toEqual([]);
  });

  it("fills the whole ring at a true 100%", () => {
    const k = computeKnowledge(fullProfile(3), sourcesOf("ai", "upload", "connection"));
    const segs = learnedSegments(k);
    expect(sum(segs)).toBeCloseTo(100, 5);
    // A slice for every section, plus the breadth slice.
    expect(segs.some((s) => s.key === "breadth")).toBe(true);
  });

  it("slices sum to the Learned % (within rounding), leaving the rest unlearned", () => {
    const k = computeKnowledge(itemsAcross(4), sourcesOf("ai"));
    // The number shown is rounded; the exact slice fill rounds to it.
    expect(Math.round(sum(learnedSegments(k)))).toBe(k.percent);
  });

  it("omits the breadth slice until a second source kind corroborates", () => {
    const oneKind = learnedSegments(computeKnowledge(fullProfile(3), sourcesOf("ai")));
    expect(oneKind.some((s) => s.key === "breadth")).toBe(false);
    const twoKinds = learnedSegments(
      computeKnowledge(fullProfile(3), sourcesOf("ai", "upload")),
    );
    expect(twoKinds.some((s) => s.key === "breadth")).toBe(true);
  });

  it("drops sections with no coverage from the legend", () => {
    // Items only in communication_register → only the "how you communicate" section.
    const items = [
      { id: "a", category: "communication_register" as const, content: "x", source: "t" },
    ];
    const segs = learnedSegments(computeKnowledge(items, []));
    expect(segs.map((s) => s.key)).toEqual(["how_you_communicate"]);
  });
});

describe("suggestImprovements", () => {
  it("targets the thinnest categories first", () => {
    const items = fullProfile(3).filter(
      (it) => it.category !== "values_and_criteria" && it.category !== "emotional_cues",
    );
    // Full source variety so only coverage nudges surface.
    const suggestions = suggestImprovements(items, sourcesOf("ai", "upload", "connection"));
    expect(suggestions.map((s) => s.category)).toEqual([
      "values_and_criteria",
      "emotional_cues",
    ]);
  });

  it("suggests a missing source kind when breadth isn't maxed", () => {
    // Full coverage, only an AI paste → breadth levers should appear.
    const suggestions = suggestImprovements(fullProfile(3), sourcesOf("ai"));
    expect(suggestions.some((s) => /Notion/.test(s.label))).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("returns nothing once coverage AND breadth are both maxed", () => {
    expect(
      suggestImprovements(fullProfile(3), sourcesOf("ai", "upload", "connection")),
    ).toEqual([]);
  });

  it("shows no breadth nudge at full variety even without a connection (no 100% contradiction)", () => {
    // ai + upload + custom = three kinds → breadth maxed, but no connection.
    const suggestions = suggestImprovements(
      fullProfile(3),
      sourcesOf("ai", "upload", "custom"),
    );
    expect(suggestions).toEqual([]);
    expect(suggestions.some((s) => /Notion/.test(s.label))).toBe(false);
  });

  it("never returns more than three suggestions", () => {
    expect(suggestImprovements([], []).length).toBeLessThanOrEqual(3);
  });

  it("links every suggestion to the Sources manager", () => {
    for (const s of suggestImprovements([], [])) {
      expect(s.href).toBe("/import");
    }
  });
});
