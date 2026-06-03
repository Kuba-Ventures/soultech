// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ChatMockup } from "./ChatMockup";
import { brand } from "@/lib/brand";

afterEach(cleanup);

// ChatMockup is the static hero illustration — no JS, pure presentation.
// It must show the brand name in the session label and the example exchange.
describe("ChatMockup", () => {
  it("labels the session with the lowercased brand name", () => {
    render(<ChatMockup />);
    expect(
      screen.getByText(
        new RegExp(`${brand.name.toLowerCase()}\\s*·\\s*learning session`, "i")
      )
    ).toBeTruthy();
  });

  it("renders the example question and the style eyebrow", () => {
    render(<ChatMockup />);
    expect(screen.getByText(/how does a transformer actually/i)).toBeTruthy();
    expect(screen.getByText(/in your style: analogy first/i)).toBeTruthy();
  });
});
