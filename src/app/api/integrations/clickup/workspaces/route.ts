import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import {
  listAgentClickUpHierarchy,
  saveAgentClickUpDestination,
} from "@/lib/integrations/clickup/workspace";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    const result = await listAgentClickUpHierarchy(user.id, user.organizationId);
    return success(result, requestId);
  });
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const user = await requireAuthenticatedUser(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const destination = await saveAgentClickUpDestination(user.id, user.organizationId, {
      teamId: body.teamId as string | undefined,
      teamName: body.teamName as string | undefined,
      spaceId: body.spaceId as string | undefined,
      spaceName: body.spaceName as string | undefined,
      listId: body.listId as string | undefined,
      listName: body.listName as string | undefined,
    });
    return success({ destination }, requestId);
  });
}
