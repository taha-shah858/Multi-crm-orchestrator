import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { generateDocument } from "@/lib/documents/document-service";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
export async function POST(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ document: await generateDocument(requireRequestContext(request), await request.json(), requestId) }, requestId, 201)); }
