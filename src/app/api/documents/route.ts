import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { createManualDocument, listDocuments } from "@/lib/documents/document-service";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ documents: await listDocuments(requireRequestContext(request)) }, requestId)); }
export async function POST(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success({ document: await createManualDocument(requireRequestContext(request), await request.json(), requestId) }, requestId, 201)); }
