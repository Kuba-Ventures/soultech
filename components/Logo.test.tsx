// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Logo } from "./Logo";
import { brand } from "@/lib/brand";

// next/image needs the Next runtime/loader; for a unit test we only care that
// Logo passes the right alt text and toggles the invert classes by variant,
// so stand it in with a plain <img> that forwards the DOM-safe props.
vi.mock("next/image", () => ({
  default: ({ priority, ...props }: any) => <img {...props} />,
}));

afterEach(cleanup);

describe("Logo", () => {
  it("uses the brand alt text", () => {
    render(<Logo />);
    expect(screen.getByAltText(brand.logo.alt)).toBeTruthy();
  });

  it("inverts to white for the light variant (dark backgrounds)", () => {
    render(<Logo variant="light" />);
    expect(screen.getByAltText(brand.logo.alt).className).toContain(
      "brightness-0 invert"
    );
  });

  it("does not invert for the original variant", () => {
    render(<Logo variant="original" />);
    expect(screen.getByAltText(brand.logo.alt).className).not.toContain(
      "invert"
    );
  });
});
