import type {
  ScopeCategory,
  ScopeMatrix,
  ToolConnection,
} from "@/lib/db/schema";

const SENSITIVE: ScopeCategory[] = ["health", "financial", "location"];

export function isSensitive(category: ScopeCategory): boolean {
  return SENSITIVE.includes(category);
}

/** JSON-RPC-ish error carrying a code; surfaced as a denied tool result. */
export class ScopeError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = "ScopeError";
  }
}

/**
 * Server-side scope enforcement for every MCP tool call. A category+mode is
 * allowed only when the connection's scopeMatrix grants it; writes also
 * require `canWriteBack`. Sensitive categories (health/financial/location) are
 * denied outright until per-source consent exists (Phase 3b); for now they are
 * always refused, regardless of the matrix.
 */
export function requireScope(
  connection: ToolConnection,
  category: ScopeCategory,
  mode: "read" | "write",
): void {
  if (isSensitive(category)) {
    throw new ScopeError(
      -32002,
      `Sensitive category '${category}' is locked and requires explicit consent.`,
    );
  }
  const matrix = connection.scopeMatrix as ScopeMatrix;
  const cell = matrix[category];
  if (!cell || !cell[mode]) {
    throw new ScopeError(
      -32001,
      `This connection does not grant '${category}.${mode}'. Enable it on the Plug in page.`,
    );
  }
  if (mode === "write" && !connection.canWriteBack) {
    throw new ScopeError(
      -32003,
      "Write-back is disabled for this connection. Turn it on under Plug in.",
    );
  }
}
