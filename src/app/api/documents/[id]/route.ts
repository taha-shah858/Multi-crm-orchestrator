import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { updateDocument } from "@/lib/documents/document-service";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return withApiErrorHandling(request, async (requestId) => success({ document: await updateDocument(requireRequestContext(request), (await params).id, await request.json(), requestId) }, requestId)); }
