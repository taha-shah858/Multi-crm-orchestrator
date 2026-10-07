import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
import { listClientDirectoryContacts } from "@/lib/client-crm/client-directory-contacts";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => {
    const records = await listClientDirectoryContacts(await requireRequestContext(request));
    return success({ records }, requestId);
  });
}
