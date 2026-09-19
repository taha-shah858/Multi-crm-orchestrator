import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { dispatchCommunication } from "@/lib/communications/communication-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) =>
    success(
      await dispatchCommunication(await requireRequestContext(request), await request.json(), requestId),
      requestId,
      201,
    ),
  );
}
