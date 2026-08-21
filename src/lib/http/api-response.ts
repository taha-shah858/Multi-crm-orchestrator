import { randomUUID } from "crypto";
import { isAppError } from "@/lib/errors/app-error";

export function success<T extends Record<string, unknown>>(
  data: T,
  requestId: string,
  status = 200,
) {
  return Response.json({ success: true, ...data, requestId }, { status });
}

export async function withApiErrorHandling(
  request: Request,
  handler: (requestId: string) => Promise<Response>,
) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();

  try {
    return await handler(requestId);
  } catch (error) {
    if (isAppError(error)) {
      return Response.json(
        {
          success: false,
          error: { code: error.code, message: error.safeMessage },
          requestId,
        },
        { status: error.status },
      );
    }

    console.error(
      JSON.stringify({
        event: "unhandled_api_error",
        requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
    );
    return Response.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
        requestId,
      },
      { status: 500 },
    );
  }
}
