// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SiteHeader, SiteFooter, ComingSoon } from "./SiteChrome";
import { brand } from "@/lib/brand";

vi.mock("next/image", () => ({
  default: ({ priority, ...props }: any) => <img {...props} />,
}));

afterEach(cleanup);

describe("SiteHeader", () => {
  it("renders the primary nav links", () => {
    render(<SiteHeader />);
    expect(screen.getByText("How it works")).toBeTruthy();
    expect(screen.getByText("Use cases")).toBeTruthy();
    expect(screen.getByText("Join waitlist")).toBeTruthy();
  });
});

describe("SiteFooter", () => {
  it("shows the copyright with the brand name and a contact link", () => {
    render(<SiteFooter />);
    expect(
      screen.getByText(new RegExp(`${brand.name}`, "i"))
    ).toBeTruthy();
    const contact = screen.getByText(brand.contactEmail);
    expect(contact.getAttribute("href")).toBe(`mailto:${brand.contactEmail}`);
  });
});

describe("ComingSoon", () => {
  it("renders the eyebrow, title, body, and both CTAs", () => {
    render(
      <ComingSoon
        eyebrow="Use cases"
        title="Coming soon"
        body="We're still building this page."
      />
    );
    expect(screen.getByText("Use cases")).toBeTruthy();
    expect(screen.getByText("Coming soon")).toBeTruthy();
    expect(screen.getByText("We're still building this page.")).toBeTruthy();
    expect(screen.getByText("Join the waitlist")).toBeTruthy();
    expect(screen.getByText("← Back home")).toBeTruthy();
  });
});
