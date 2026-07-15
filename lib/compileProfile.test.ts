import { describe, it, expect } from "vitest";
import { compileProfile, styleTag } from "./compileProfile";
import type { Profile, ProfileItem } from "@/lib/profile/v1/types";

function profile(items: Partial<ProfileItem>[]): Profile {
  return {
    userId: "m1",
    updatedAt: new Date(0).toISOString(),
    items: items.map((it, i) => ({
      id: String(i),
      category: it.category ?? "communication_register",
      content: it.content ?? "example observation",
      source: it.source ?? "import",
      ...(it.frequency != null ? { frequency: it.frequency } : {}),
    })),
  };
}

describe("compileProfile", () => {
  it("returns the empty-profile prompt when there are no items", () => {
    const p = compileProfile(profile([]));
    expect(p).toMatch(/don't have a profile for this person yet/i);
    expect(compileProfile(null)).toBe(p);
  });

  it("includes the preamble, category directives, and item content", () => {
    const p = compileProfile(
      profile([
        { category: "information_delivery", content: "likes analogy-first explanations" },
        { category: "engagement_style", content: "wants to be challenged, not affirmed" },
      ]),
    );
    expect(p).toMatch(/personalized learning partner/i);
    expect(p).toContain("likes analogy-first explanations");
    expect(p).toContain("wants to be challenged, not affirmed");
    // directive framing, not a raw dump
    expect(p).toMatch(/How they like information delivered/i);
  });

  it("only emits sections for categories that have items", () => {
    const p = compileProfile(profile([{ category: "emotional_cues", content: "uses '??' when excited" }]));
    expect(p).toContain("uses '??' when excited");
    expect(p).not.toMatch(/How they reason/i);
  });
});

describe("styleTag", () => {
  it("derives a delivery tag from the profile", () => {
    expect(
      styleTag(profile([{ category: "information_delivery", content: "explain with an analogy" }])),
    ).toBe("analogy-first");
    expect(
      styleTag(profile([{ category: "information_delivery", content: "go step-by-step" }])),
    ).toBe("step-by-step");
  });

  it("falls back sensibly", () => {
    expect(styleTag(profile([]))).toBe("getting to know you");
    expect(
      styleTag(profile([{ category: "recurring_topics", content: "fitness programming" }])),
    ).toBe("calibrated to you");
  });
});
