import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { listCommunicationIdentities } from "@/lib/communications/communication-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) =>
    success({ identities: await listCommunicationIdentities(requireRequestContext(request)) }, requestId),
  );
}
