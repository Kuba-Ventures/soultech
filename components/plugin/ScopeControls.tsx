"use client";

import { useState, useTransition } from "react";
import { updateScope, updateWriteBack } from "@/app/(app)/plugin/actions";
import type { ScopeCategory, ScopeMatrix } from "@/lib/db/schema";

type RowDef = {
  cat: ScopeCategory;
  label: string;
  sub: string;
  writable: boolean;
};

const ROWS: RowDef[] = [
  { cat: "profile", label: "Profile", sub: "identity + completeness", writable: false },
  { cat: "learning_style", label: "Learning style", sub: "powers acceleration", writable: false },
  { cat: "memories", label: "Memories", sub: "facts, plans, notes", writable: true },
  { cat: "tracks", label: "Learning tracks", sub: "progress + next reps", writable: true },
];

/**
 * The live scope matrix for the member's MCP connection. Every toggle persists
 * to `tool_connections.scopeMatrix` / `canWriteBack` and is enforced by the
 * MCP server on each tool call. Writes are gated by the master write-back
 * switch AND the per-category write cell. Sensitive categories stay locked
 * until per-source consent (Phase 3b).
 */
export function ScopeControls({
  initialMatrix,
  initialWriteBack,
}: {
  initialMatrix: ScopeMatrix;
  initialWriteBack: boolean;
}) {
  const [matrix, setMatrix] = useState<ScopeMatrix>(initialMatrix ?? {});
  const [writeBack, setWriteBack] = useState(initialWriteBack);
  const [, startTransition] = useTransition();

  function cell(cat: ScopeCategory, mode: "read" | "write"): boolean {
    return Boolean(matrix[cat]?.[mode]);
  }

  function toggle(cat: ScopeCategory, mode: "read" | "write") {
    const next = !cell(cat, mode);
    setMatrix((prev) => ({
      ...prev,
      [cat]: { read: false, write: false, ...prev[cat], [mode]: next },
    }));
    startTransition(async () => {
      await updateScope(cat, mode, next);
    });
  }

  function toggleWriteBack() {
    const next = !writeBack;
    setWriteBack(next);
    startTransition(async () => {
      await updateWriteBack(next);
    });
  }

  return (
    <div className="rise">
      <div className="writeback">
        <div>
          <div className="wb-h">Allow write-back</div>
          <div className="wb-s">
            Let connected tools save new memories and advance tracks. Off by
            default; required for any write below.
          </div>
        </div>
        <button
          type="button"
          aria-label="Allow write-back"
          aria-pressed={writeBack}
          className={`sw${writeBack ? " on" : ""}`}
          onClick={toggleWriteBack}
        />
      </div>

      <div className="mxwrap">
        <table className="matrix">
          <thead>
            <tr>
              <th />
              <th>Read</th>
              <th>Write</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.cat}>
                <th>
                  {row.label}
                  <small>{row.sub}</small>
                </th>
                <td>
                  <button
                    type="button"
                    aria-label={`${row.label} · read`}
                    aria-pressed={cell(row.cat, "read")}
                    className={`sw${cell(row.cat, "read") ? " on" : ""}`}
                    onClick={() => toggle(row.cat, "read")}
                  />
                </td>
                <td>
                  {row.writable ? (
                    <button
                      type="button"
                      aria-label={`${row.label} · write`}
                      aria-pressed={cell(row.cat, "write")}
                      className={`sw${cell(row.cat, "write") ? " on" : ""}${writeBack ? "" : " lock"}`}
                      onClick={() => writeBack && toggle(row.cat, "write")}
                      disabled={!writeBack}
                    />
                  ) : (
                    <span className="sw lock" aria-hidden="true" />
                  )}
                </td>
              </tr>
            ))}
            <tr>
              <th>
                Sensitive data
                <small>health, money, location</small>
              </th>
              <td>
                <span className="sw lock" aria-hidden="true" />
              </td>
              <td>
                <span className="sw lock" aria-hidden="true" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
