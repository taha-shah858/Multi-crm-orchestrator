import { randomUUID } from "crypto";

/** Ensures unmatched API URLs use the API's JSON failure contract, never a UI 404 document. */
function missingApiRoute(request: Request) {
  return Response.json({
    success: false,
    error: { code: "API_ROUTE_NOT_FOUND", message: "This API route was not found." },
    requestId: request.headers.get("x-request-id") ?? randomUUID(),
  }, { status: 404 });
}

export const dynamic = "force-dynamic";
export const GET = missingApiRoute;
export const POST = missingApiRoute;
export const PUT = missingApiRoute;
export const PATCH = missingApiRoute;
export const DELETE = missingApiRoute;
