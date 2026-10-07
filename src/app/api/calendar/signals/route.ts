import type { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/auth/request-context";
import { requireCalendarAgent } from "@/lib/calendar/calendar-connections";
import { analyzeSchedulingTranscript } from "@/lib/calendar/scheduling-analysis";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async (requestId) => {
    const context = await requireRequestContext(request);
    requireCalendarAgent(context.user);
    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new AppError("INVALID_SCRIPT_INPUT", 422, "Invalid request.", "Enter a conversation script.");
    const transcript = typeof input.transcript === "string" ? input.transcript.trim() : "";
    if (!transcript || transcript.length > 12000 || input.clientAccountId !== context.activeClientAccountId) throw new AppError("INVALID_SCRIPT_INPUT", 422, "Invalid script or client.", "Select the correct client and enter a script of up to 12,000 characters.");
    const timeZone = typeof input.timeZone === "string" ? input.timeZone : "UTC";
    try { new Intl.DateTimeFormat("en", { timeZone }).format(); } catch { throw new AppError("INVALID_SCRIPT_INPUT", 422, "Invalid timezone.", "Choose a valid timezone."); }
    const contactId = typeof input.contactId === "string" && input.contactId ? input.contactId : null;
    if (contactId && !await prisma.contact.findFirst({ where: { id: contactId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId } })) throw new AppError("CONTACT_NOT_FOUND", 404, "Contact outside client.", "Choose a contact from this client.");
    const analysis = await analyzeSchedulingTranscript(transcript, timeZone);
    if (!analysis.agreed) return success({ signal: null, message: "No prospect agreement to a meeting was detected." }, requestId);
    const interaction = await prisma.interaction.create({
      data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, userId: context.user.id, contactId, type: "NOTE", source: "MANUAL", subject: "AI meeting agreement", body: transcript, metadata: { schedulingAnalysis: { ...analysis, timeZone } } },
      include: { contact: { select: { id: true, firstName: true, lastName: true, company: true } } },
    });
    return success({ signal: { ...interaction, analysis, reason: analysis.evidence }, message: "Meeting agreement detected. Choose a slot and confirm the calendar." }, requestId, 201);
  });
}
