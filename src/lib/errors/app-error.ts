export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_UNAVAILABLE"
  | "INVALID_SIGNUP"
  | "EMAIL_IN_USE"
  | "CLIENT_ACCESS_DENIED"
  | "INVALID_USER_INPUT"
  | "INVALID_CLIENT_ASSIGNMENT"
  | "INVALID_CLIENT_ACCOUNT_INPUT"
  | "CLIENT_ACCOUNT_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "CLIENT_CONTEXT_REQUIRED"
  | "CRM_PROVIDER_UNAVAILABLE"
  | "SYNC_CONNECTION_NOT_FOUND"
  | "SYNC_FAILED"
  | "INVALID_INTERACTION_INPUT"
  | "CONTACT_NOT_FOUND"
  | "INVALID_CONTACT_INPUT"
  | "COMPANY_NOT_FOUND"
  | "INVALID_COMPANY_INPUT"
  | "DEAL_NOT_FOUND"
  | "INVALID_DEAL_INPUT"
  | "INVALID_DEAL_OWNER"
  | "INTEGRATION_CONFIGURATION_ERROR"
  | "INVALID_INTEGRATION_TARGET"
  | "INVALID_OAUTH_STATE"
  | "INTEGRATION_NOT_FOUND"
  | "EXTERNAL_SERVICE_ERROR"
  | "COMMUNICATION_IDENTITY_NOT_FOUND"
  | "INVALID_COMMUNICATION_INPUT"
  | "COMMUNICATION_PROVIDER_UNAVAILABLE"
  | "INVALID_LEAD_ANALYSIS_INPUT"
  | "LEAD_ANALYSIS_NOT_FOUND"
  | "LEAD_ANALYSIS_LINK_MISMATCH"
  | "INVALID_SCRIPT_INPUT"
  | "SCRIPT_NOT_FOUND"
  | "INVALID_APPOINTMENT_INPUT"
  | "APPOINTMENT_NOT_FOUND"
  | "INTERACTION_NOT_FOUND"
  | "APPOINTMENT_LINK_MISMATCH"
  | "CALENDAR_PROVIDER_UNAVAILABLE"
  | "INVALID_COMMISSION_INPUT"
  | "COMMISSION_NOT_FOUND"
  | "INVALID_LEDGER_ENTRY"
  | "INVALID_TIME_LOG_INPUT"
  | "TIME_LOG_NOT_FOUND"
  | "INVALID_DOCUMENT_INPUT"
  | "DOCUMENT_NOT_FOUND"
  | "DOCUMENT_CONTEXT_LINK_MISMATCH"
  | "DOCUMENT_FILE_INVALID"
  | "RECORD_NOT_FOUND"
  | "HANDOFF_NOT_FOUND"
  | "CREDENTIAL_NOT_FOUND"
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
  return (
    error instanceof AppError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      "status" in error &&
      "safeMessage" in error &&
      typeof (error as Record<string, unknown>).safeMessage === "string")
  );
}
