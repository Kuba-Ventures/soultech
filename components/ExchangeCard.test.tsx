// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ExchangeCard } from "./ExchangeCard";

afterEach(cleanup);

// ExchangeCard is a low-risk presentational component: given a prompt, a
// style label, and a response, it must render all three. If a refactor drops
// one of the props from the markup, these fail.
describe("ExchangeCard", () => {
  it("renders the prompt, style label, and response text", () => {
    render(
      <ExchangeCard
        prompt="What is a monad?"
        styleLabel="In your style: plain English"
        response="A way to chain steps that might fail."
      />
    );
    expect(screen.getByText("What is a monad?")).toBeTruthy();
    expect(screen.getByText("In your style: plain English")).toBeTruthy();
    expect(
      screen.getByText("A way to chain steps that might fail.")
    ).toBeTruthy();
  });
});
