import { NextResponse, type NextRequest } from "next/server";
import { resendPendingSignupOtp } from "@/lib/email/email-service";
import { resendOtpSchema } from "@/lib/auth/validations";
import { withApiErrorHandling } from "@/lib/http/api-response";
import { AppError } from "@/lib/errors/app-error";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const body = await request.json();
    const parsed = resendOtpSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("INVALID_EMAIL", 422, parsed.error.issues[0]?.message || "Invalid email format.", "Provide a valid email address.");
    }
    const result = await resendPendingSignupOtp(parsed.data.email);
    return NextResponse.json({ success: true, message: "A new verification code has been dispatched.", expiresAt: result.expiresAt, requestId });
  });
}
