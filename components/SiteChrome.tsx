import Link from "next/link";
import { brand } from "@/lib/brand";
import { Logo } from "@/components/Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-black/10">
      <div className="mx-auto max-w-6xl px-6 h-24 sm:h-28 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo height={56} />
          <span className="sr-only">{brand.name}</span>
        </Link>
        <nav className="flex items-center gap-5 sm:gap-7 text-sm text-neutral-700">
          <Link href="/how-it-works" className="hover:text-black transition">
            How it works
          </Link>
          <Link
            href="/use-cases"
            className="hover:text-black transition hidden sm:inline"
          >
            Use cases
          </Link>
          <Link
            href="/#waitlist"
            className="rounded-full bg-black text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 transition"
          >
            Join waitlist
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="py-12">
      <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 text-sm text-white/50">
        <div className="flex items-center gap-4">
          <div className="rounded-md bg-white px-2.5 py-1.5">
            <Logo height={20} />
          </div>
          <span>
            © {brand.year} {brand.name}. All rights reserved.
          </span>
        </div>
        <a
          href={`mailto:${brand.contactEmail}`}
          className="hover:text-white transition"
        >
          {brand.contactEmail}
        </a>
      </div>
    </footer>
  );
}

type ComingSoonProps = {
  eyebrow: string;
  title: string;
  body?: string;
};

export function ComingSoon({ eyebrow, title, body }: ComingSoonProps) {
  return (
    <section className="bg-glow">
      <div className="mx-auto max-w-3xl px-6 py-32 sm:py-40 text-center">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
          {eyebrow}
        </div>
        <h1 className="mt-3 text-4xl sm:text-5xl font-medium tracking-[-0.02em] leading-[1.05]">
          {title}
        </h1>
        {body && (
          <p className="mt-6 text-lg text-white/65 leading-relaxed">{body}</p>
        )}
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/#waitlist"
            className="inline-flex items-center justify-center rounded-full bg-white text-black px-5 py-3 text-sm font-medium hover:bg-white/90 transition"
          >
            Join the waitlist
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full hairline text-white/80 px-5 py-3 text-sm hover:text-white hover:border-white/20 transition"
          >
            ← Back home
          </Link>
        </div>
      </div>
    </section>
  );
}
