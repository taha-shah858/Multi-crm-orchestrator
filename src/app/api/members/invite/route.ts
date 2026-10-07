import { NextResponse, type NextRequest } from "next/server";
import { inviteMember } from "@/lib/members/member-service";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const actor = await requireAuthenticatedUser(request);
    const body = await request.json();
    const result = await inviteMember(actor, body, request.nextUrl.origin);
    return NextResponse.json({ ...result, requestId }, { status: 201 });
  });
}
