import { NextResponse, type NextRequest } from "next/server";
import { listOrganizationMembers } from "@/lib/members/member-service";
import { createManagedUser } from "@/lib/admin/admin-service";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const actor = await requireAuthenticatedUser(request);
    const data = await listOrganizationMembers(actor);
    return NextResponse.json({ success: true, ...data, requestId });
  });
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const actor = await requireAuthenticatedUser(request);
    const body = await request.json();
    const user = await createManagedUser(actor, body);
    return NextResponse.json({ success: true, user, requestId }, { status: 201 });
  });
}
