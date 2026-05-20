"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "submitting" | "error";

export function LoginForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const fd = new FormData(e.currentTarget);
    const payload = {
      email: String(fd.get("email") || "").trim(),
      password: String(fd.get("password") || ""),
    };

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Sign-in failed");
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Sign-in failed");
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl hairline bg-white/[0.02] p-6 sm:p-8 space-y-4"
      noValidate
    >
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

      <label className="block">
        <span className="text-xs uppercase tracking-wider text-white/50">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="mt-1 w-full bg-transparent hairline rounded-lg px-3 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
        />
      </label>

      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-xs text-white/40">
          Members only. By invitation.
        </p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center rounded-full bg-white text-black px-5 py-2.5 text-sm font-medium hover:bg-white/90 disabled:opacity-60 transition"
        >
          {status === "submitting" ? "Signing in…" : "Sign in"}
        </button>
      </div>

      {status === "error" && (
        <p className="text-sm text-rose-400">{errorMsg}</p>
      )}
    </form>
  );
}
