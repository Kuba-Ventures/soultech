"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function WaitlistForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      useCase: String(fd.get("useCase") || "").trim(),
    };

    try {
      // TODO: swap this endpoint for Resend / Formspree / Supabase / Convex
      // when wiring up the real backend. The dev route writes to data/waitlist.json
      // (ephemeral on Vercel — fine for a demo, not for production).
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong");
      }
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-2xl hairline bg-white/[0.03] p-8 text-center animate-fade-up"
      >
        <div className="text-2xl font-medium tracking-tight">
          You&rsquo;re on the list.
        </div>
        <p className="mt-2 text-white/60">We&rsquo;ll be in touch.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl hairline bg-white/[0.02] p-6 sm:p-8 space-y-4"
      noValidate
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-white/50">
            Name
          </span>
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Ada Lovelace"
            className="mt-1 w-full bg-transparent hairline rounded-lg px-3 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-white/50">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@domain.com"
            className="mt-1 w-full bg-transparent hairline rounded-lg px-3 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs uppercase tracking-wider text-white/50">
          What would you use this for?
        </span>
        <input
          name="useCase"
          type="text"
          placeholder="One line is enough"
          className="mt-1 w-full bg-transparent hairline rounded-lg px-3 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
        />
      </label>

      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-xs text-white/40">
          No spam. We share nothing. Unsubscribe anytime.
        </p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center rounded-full bg-white text-black px-5 py-2.5 text-sm font-medium hover:bg-white/90 disabled:opacity-60 transition"
        >
          {status === "submitting" ? "Sending…" : "Join the waitlist"}
        </button>
      </div>

      {status === "error" && (
        <p className="text-sm text-rose-400">{errorMsg}</p>
      )}
    </form>
  );
}
