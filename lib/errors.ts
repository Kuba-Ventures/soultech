/**
 * Typed errors for trust boundaries (server actions, API routes).
 *
 * Throw an `AppError` with a code and a user-safe message inside server
 * actions; surface `error.userMessage` to the client and log the rest.
 */

export type AppErrorCode =
  | "unauthorized"
  | "not_found"
  | "invalid_input"
  | "rate_limited"
  | "model_failed"
  | "internal";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly userMessage: string;
  readonly cause?: unknown;

  constructor(code: AppErrorCode, userMessage: string, opts?: { cause?: unknown; internal?: string }) {
    super(opts?.internal ?? userMessage);
    this.name = "AppError";
    this.code = code;
    this.userMessage = userMessage;
    this.cause = opts?.cause;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
