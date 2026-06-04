"use client";

import { useEffect, useRef, useState } from "react";
import { useClerk } from "@clerk/nextjs";

/**
 * Topbar identity control: the email + amber avatar. Click opens a small
 * profile card with the member's identity and a sign-out action (Clerk).
 */
export function ProfileMenu({ email, name }: { email: string; name?: string }) {
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (name?.trim()[0] || email.trim()[0] || "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="profile" ref={ref}>
      <button
        type="button"
        className="who-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="who-email">{email}</span>
        <span className="av">{initial}</span>
      </button>

      {open && (
        <div className="profile-card" role="menu">
          <div className="pc-head">
            <span className="pc-av">{initial}</span>
            <div className="pc-id">
              {name && <div className="pc-name">{name}</div>}
              <div className="pc-email">{email}</div>
            </div>
          </div>
          <button
            type="button"
            className="pc-signout"
            role="menuitem"
            onClick={() => signOut({ redirectUrl: "/" })}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
