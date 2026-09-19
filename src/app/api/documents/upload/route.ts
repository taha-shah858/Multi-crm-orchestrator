import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { uploadPdfDocument } from "@/lib/documents/document-service";
import { AppError } from "@/lib/errors/app-error";
import { withApiErrorHandling, success } from "@/lib/http/api-response";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => { const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) throw new AppError("DOCUMENT_FILE_INVALID", 422, "PDF file missing.", "Choose a PDF proposal to upload."); const document = await uploadPdfDocument(await requireRequestContext(request), { file, title: typeof form.get("title") === "string" ? form.get("title") as string : undefined, contactId: typeof form.get("contactId") === "string" ? form.get("contactId") as string : undefined, leadAnalysisId: typeof form.get("leadAnalysisId") === "string" ? form.get("leadAnalysisId") as string : undefined, dealId: typeof form.get("dealId") === "string" ? form.get("dealId") as string : undefined }, requestId); return success({ document }, requestId, 201); }); }
