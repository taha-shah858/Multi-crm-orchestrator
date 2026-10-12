import type { NextRequest } from "next/server";
import { requestPasswordReset } from "@/lib/auth/password-reset-service";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => success(await requestPasswordReset(await request.json()), requestId));
}
