import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { downloadDocument } from "@/lib/documents/document-service";
import { withApiErrorHandling } from "@/lib/http/api-response";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return withApiErrorHandling(request, async () => { const document = await downloadDocument(await requireRequestContext(request), (await params).id); return new Response(document.fileData, { headers: { "content-type": document.mimeType ?? "application/pdf", "content-disposition": `attachment; filename="${(document.fileName ?? "document.pdf").replaceAll('"', "")}"` } }); }); }
