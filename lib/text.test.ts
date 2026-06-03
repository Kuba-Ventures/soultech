import { describe, it, expect } from "vitest";
import { stripEmDashes } from "./text";

// Real tests for a low-risk pure surface. Each case asserts a specific,
// documented behavior of stripEmDashes — break the regex logic and one of
// these fails. No expect(true).toBe(true) filler.
describe("stripEmDashes", () => {
  it("turns a spaced em-dash into a comma", () => {
    expect(stripEmDashes("Hello — world")).toBe("Hello, world");
  });

  it("turns a bare em-dash (no surrounding spaces) into a comma", () => {
    expect(stripEmDashes("Hello—world")).toBe("Hello, world");
  });

  it("collapses extra spaces around an em-dash", () => {
    expect(stripEmDashes("a   —   b")).toBe("a, b");
  });

  it("converts a spaced en-dash separator into a comma", () => {
    expect(stripEmDashes("from 10 – 20")).toBe("from 10, 20");
  });

  it("keeps an en-dash number range as a hyphen", () => {
    expect(stripEmDashes("range 10–20")).toBe("range 10-20");
  });

  it("collapses the double-comma that an adjacent em-dash + comma produces", () => {
    expect(stripEmDashes("Yes—, indeed")).toBe("Yes, indeed");
  });

  it("leaves clean text untouched (no false positives)", () => {
    expect(stripEmDashes("Just a normal sentence.")).toBe("Just a normal sentence.");
  });

  it("returns an empty string unchanged", () => {
    expect(stripEmDashes("")).toBe("");
  });

  it("is idempotent — running it twice changes nothing further", () => {
    const once = stripEmDashes("First — second – third—fourth");
    expect(stripEmDashes(once)).toBe(once);
  });

  it("produces output with no em-dashes or en-dashes left as separators", () => {
    const out = stripEmDashes("a — b — c – d");
    expect(out).not.toMatch(/—/);
    expect(out).toBe("a, b, c, d");
  });
});
