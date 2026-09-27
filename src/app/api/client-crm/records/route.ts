import type { NextRequest } from "next/server";
import type { ClientRecordType } from "@prisma/client";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { listClientCrmRecords } from "@/lib/client-crm/client-crm-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    const typeParam = (request.nextUrl.searchParams.get("type") ||
      request.nextUrl.searchParams.get("recordType")) as ClientRecordType | null;
    const records = await listClientCrmRecords(context, typeParam || undefined);
    return success({ records }, requestId);
  });
}
