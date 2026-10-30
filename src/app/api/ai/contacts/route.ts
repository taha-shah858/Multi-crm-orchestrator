import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { listAiClientContacts } from "@/lib/ai/client-contacts";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => success({ contacts: await listAiClientContacts(await requireRequestContext(request)) }, requestId));
}
