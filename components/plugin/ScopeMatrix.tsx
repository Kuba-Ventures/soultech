"use client";

import { useState } from "react";

type Row = { label: string; sub?: string; cols: boolean[]; locked?: boolean };

const TOOLS = ["Claude", "Cursor", "ChatGPT", "Notion"];

const INITIAL_ROWS: Row[] = [
  { label: "Facts & plans", cols: [true, true, false, true] },
  { label: "Learning style", sub: "powers acceleration", cols: [true, true, false, false] },
  { label: "Your voice & tone", cols: [true, false, false, true] },
  { label: "Raw memories", cols: [true, false, false, false] },
  { label: "Write back to my brain", sub: "two-way sync", cols: [true, true, false, false] },
  { label: "Sensitive data", sub: "health, money, location", cols: [false, false, false, false], locked: true },
];

/**
 * What each tool can see and write. Phase 2 renders the matrix with optimistic
 * toggles; the sensitive row stays locked. Phase 3 binds these to each
 * connection's scopeMatrix and enforces them in the MCP server.
 */
export function ScopeMatrix() {
  const [rows, setRows] = useState<Row[]>(INITIAL_ROWS);

  function toggle(r: number, c: number) {
    setRows((prev) =>
      prev.map((row, ri) =>
        ri === r && !row.locked
          ? { ...row, cols: row.cols.map((v, ci) => (ci === c ? !v : v)) }
          : row,
      ),
    );
  }

  return (
    <div className="mxwrap rise">
      <table className="matrix">
        <thead>
          <tr>
            <th />
            {TOOLS.map((t) => (
              <th key={t}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.label}>
              <th>
                {row.label}
                {row.sub && <small>{row.sub}</small>}
              </th>
              {row.cols.map((on, ci) => (
                <td key={ci}>
                  <button
                    type="button"
                    aria-label={`${row.label} · ${TOOLS[ci]}`}
                    aria-pressed={on}
                    className={`sw${on ? " on" : ""}${row.locked ? " lock" : ""}`}
                    onClick={() => toggle(ri, ci)}
                    disabled={row.locked}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
