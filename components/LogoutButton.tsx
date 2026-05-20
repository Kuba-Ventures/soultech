"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full hairline text-white/80 px-5 py-2.5 text-sm hover:text-white hover:border-white/20 disabled:opacity-60 transition"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
