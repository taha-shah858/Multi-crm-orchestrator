import { NextResponse, type NextRequest } from "next/server";
import { revokeInvitation } from "@/lib/members/member-service";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiErrorHandling(request, async (requestId) => {
    const actor = await requireAuthenticatedUser(request);
    const { id } = await params;
    const result = await revokeInvitation(actor, id);
    return NextResponse.json({ ...result, requestId }, { status: 200 });
  });
}
