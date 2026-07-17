import { describe, it, expect } from "vitest";
import {
  partitionBySensitivity,
  SENSITIVITY_TAGS,
  type ParsedItem,
} from "./parse";

function item(sensitivity: ParsedItem["sensitivity"]): ParsedItem {
  return {
    category: "communication_register",
    content: "example",
    lead: "example",
    source: "import",
    frequency: null,
    sensitivity,
  };
}

// The sensitivity filter is the privacy backstop: only "none" items are kept
// and persisted; everything else is dropped before it can reach a profile.
describe("partitionBySensitivity", () => {
  it("keeps only 'none' and drops every sensitive tag", () => {
    const items = [
      item("none"),
      item("health"),
      item("none"),
      item("financial"),
      item("location"),
      item("identity"),
    ];
    const { kept, dropped } = partitionBySensitivity(items);
    expect(kept).toHaveLength(2);
    expect(dropped).toHaveLength(4);
    expect(kept.every((i) => i.sensitivity === "none")).toBe(true);
  });

  it("handles an empty list", () => {
    const { kept, dropped } = partitionBySensitivity([]);
    expect(kept).toHaveLength(0);
    expect(dropped).toHaveLength(0);
  });

  it("defines the expected sensitivity tags", () => {
    expect([...SENSITIVITY_TAGS]).toEqual([
      "none",
      "health",
      "financial",
      "location",
      "identity",
    ]);
  });
});
