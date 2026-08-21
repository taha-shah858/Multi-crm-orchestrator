export type ErrorCode =
  | "UNAUTHENTICATED"
  | "CLIENT_CONTEXT_REQUIRED"
  | "CRM_PROVIDER_UNAVAILABLE"
  | "SYNC_CONNECTION_NOT_FOUND"
  | "SYNC_FAILED"
  | "INTEGRATION_CONFIGURATION_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
    public readonly safeMessage = "The request could not be completed.",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
