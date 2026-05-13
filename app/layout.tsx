import type { Metadata } from "next";
import "./globals.css";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description:
    "Train a personal AI on your voice, your thinking, your style. Get unstuck faster — in a way that actually makes sense to you.",
  openGraph: {
    title: `${brand.name} — ${brand.tagline}`,
    description:
      "Train a personal AI on your voice, your thinking, your style.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink text-white font-sans antialiased">
        {/* TODO: analytics / tracking pixels go here (e.g. Vercel Analytics, Plausible, GA) */}
        {children}
      </body>
    </html>
  );
}
