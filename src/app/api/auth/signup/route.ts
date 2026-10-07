import { NextResponse, type NextRequest } from "next/server";
import { signUp } from "@/lib/auth/auth-service";
import { withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_JSON", message: "Malformed or invalid JSON body in request." },
          requestId,
        },
        { status: 400 }
      );
    }

    const result = await signUp(body);
    return NextResponse.json(
      {
        success: true,
        requiresVerification: true,
        email: result.email,
        message: result.message,
        requestId,
      },
      { status: 200 }
    );
  });
}
