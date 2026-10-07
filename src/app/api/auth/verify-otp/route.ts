import { NextResponse, type NextRequest } from "next/server";
import { verifySignUpOtp } from "@/lib/auth/auth-service";
import { withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const body = await request.json();
    const result = await verifySignUpOtp(body);
    const response = NextResponse.json(
      {
        success: true,
        user: result.user,
        message: "Account verified successfully. Please log in to start working.",
        requestId,
      },
      { status: 200 }
    );
    // Note: Do not auto-set session cookies so the user explicitly logs in via /login
    return response;
  });
}
