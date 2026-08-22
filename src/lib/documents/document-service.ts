import { recordAuditEvent } from "@/lib/audit/audit-log";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";

type Input = Record<string, unknown>;
type DocumentKind = "PROPOSAL" | "FOLLOW_UP_EMAIL" | "FOLLOW_UP_MESSAGE" | "MANUAL_NOTE" | "FILE_UPLOAD";
type DocumentStatus = "DRAFT" | "FINAL";
const kinds = ["PROPOSAL", "FOLLOW_UP_EMAIL", "FOLLOW_UP_MESSAGE", "MANUAL_NOTE", "FILE_UPLOAD"] as const;
const editableKinds = ["PROPOSAL", "FOLLOW_UP_EMAIL", "FOLLOW_UP_MESSAGE", "MANUAL_NOTE"] as const;
const documentInclude = { contact: { select: { id: true, firstName: true, lastName: true, company: true, email: true } }, leadAnalysis: { select: { id: true, summary: true, requirements: true, timeline: true, budget: true, leadScore: true } }, deal: { select: { id: true, title: true, valueCents: true, currency: true, status: true } } } as const;

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const kind = (value: unknown, options: readonly DocumentKind[] = kinds): DocumentKind => { if (options.includes(value as DocumentKind)) return value as DocumentKind; throw new AppError("INVALID_DOCUMENT_INPUT", 422, "Invalid document type.", "Choose a supported document type."); };
const status = (value: unknown, fallback: DocumentStatus = "DRAFT") => value === undefined ? fallback : value === "DRAFT" || value === "FINAL" ? value : (() => { throw new AppError("INVALID_DOCUMENT_INPUT", 422, "Invalid document status.", "Choose draft or final status."); })();

async function documentContext(context: RequestContext, input: Input) {
  const contactId = text(input.contactId) || null; const leadAnalysisId = text(input.leadAnalysisId) || null; const dealId = text(input.dealId) || null;
  const [account, requestedContact, leadAnalysis, deal] = await Promise.all([
    prisma.clientAccount.findFirst({ where: { id: context.activeClientAccountId, organizationId: context.user.organizationId }, select: { name: true, brandName: true } }),
    contactId ? prisma.contact.findFirst({ where: { id: contactId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, select: { id: true, firstName: true, lastName: true, email: true, company: true } }) : null,
    leadAnalysisId ? prisma.leadAnalysis.findFirst({ where: { id: leadAnalysisId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, select: { id: true, contactId: true, summary: true, requirements: true, timeline: true, budget: true, leadScore: true } }) : null,
    dealId ? prisma.deal.findFirst({ where: { id: dealId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, select: { id: true, contactId: true, title: true, valueCents: true, currency: true, status: true } }) : null,
  ]);
  if (!account) throw new AppError("CLIENT_CONTEXT_REQUIRED", 404, "Active client account was not found.", "Select an active client account before creating a document.");
  if (contactId && !requestedContact) throw new AppError("CONTACT_NOT_FOUND", 404, "Contact is outside active client.", "Choose a contact from the active client account.");
  if (leadAnalysisId && !leadAnalysis) throw new AppError("LEAD_ANALYSIS_NOT_FOUND", 404, "Analysis is outside active client.", "Choose an analysis from the active client account.");
  if (dealId && !deal) throw new AppError("INVALID_DOCUMENT_INPUT", 404, "Deal is outside active client.", "Choose a deal from the active client account.");
  const relatedContactIds = [leadAnalysis?.contactId, deal?.contactId].filter((id): id is string => Boolean(id));
  const canonicalContactId = contactId ?? relatedContactIds[0] ?? null;
  if (relatedContactIds.some((id) => id !== canonicalContactId)) {
    throw new AppError("DOCUMENT_CONTEXT_LINK_MISMATCH", 422, "Selected document context is inconsistent.", "Use a contact, deal, and lead analysis that belong to the same lead.");
  }
  const contact = requestedContact ?? (canonicalContactId
    ? await prisma.contact.findFirst({ where: { id: canonicalContactId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, select: { id: true, firstName: true, lastName: true, email: true, company: true } })
    : null);
  return { account, contact, leadAnalysis, deal, contactId: canonicalContactId, leadAnalysisId, dealId };
}

function generatedDocument(type: Exclude<DocumentKind, "MANUAL_NOTE" | "FILE_UPLOAD">, data: Awaited<ReturnType<typeof documentContext>>) {
  const recipient = data.contact ? `${data.contact.firstName} ${data.contact.lastName}` : "the client team";
  const requirements = data.leadAnalysis?.requirements ?? "the priorities discussed"; const timeline = data.leadAnalysis?.timeline ?? "the next agreed milestone"; const budget = data.leadAnalysis?.budget ?? (data.deal ? new Intl.NumberFormat(undefined, { style: "currency", currency: data.deal.currency, maximumFractionDigits: 0 }).format(data.deal.valueCents / 100) : "the proposed investment");
  if (type === "FOLLOW_UP_EMAIL") return { title: `Follow-up · ${recipient}`, content: `Subject: Next steps with ${data.account.brandName}\n\nHi ${recipient},\n\nThank you for the conversation. Based on our discussion, ${data.account.brandName} can help with ${requirements}.\n\nI have outlined the next steps around ${timeline}. Please reply with any questions or a suitable time to review the proposal.\n\nBest,\n[Your name]\n${data.account.brandName}` };
  if (type === "FOLLOW_UP_MESSAGE") return { title: `Follow-up message · ${recipient}`, content: `Hi ${recipient}, this is [Your name] from ${data.account.brandName}. I’m following up on ${requirements}. I’ve prepared the next steps for ${timeline}. Would you like me to send the proposal or set up a short review?` };
  return { title: `${data.account.brandName} proposal · ${recipient}`, content: `# ${data.account.brandName} proposal\n\nPrepared for: ${recipient}\n\n## Executive summary\n${data.account.brandName} will support ${requirements} with a focused, measurable implementation plan.\n\n## Recommended approach\n1. Confirm the working requirements and stakeholders.\n2. Align the delivery plan with ${timeline}.\n3. Review progress and next steps with the client team.\n\n## Commercial context\nIndicative investment: ${budget}.\n\n## Next step\nPlease review this draft and confirm the preferred review time.\n\nPrepared by ${data.account.brandName}` };
}

export async function listDocuments(context: RequestContext) { await prepareActiveClientSync(context); return prisma.document.findMany({ where: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, include: documentInclude, orderBy: { updatedAt: "desc" }, take: 100 }); }

export async function generateDocument(context: RequestContext, input: Input, requestId: string) {
  await prepareActiveClientSync(context); const type = kind(input.type, ["PROPOSAL", "FOLLOW_UP_EMAIL", "FOLLOW_UP_MESSAGE"]) as "PROPOSAL" | "FOLLOW_UP_EMAIL" | "FOLLOW_UP_MESSAGE"; const data = await documentContext(context, input); const draft = generatedDocument(type, data); const document = await prisma.document.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, contactId: data.contactId, leadAnalysisId: data.leadAnalysisId, dealId: data.dealId, userId: context.user.id, type, source: "GENERATED", title: draft.title, content: draft.content, contextSnapshot: { brand: data.account.brandName, contact: data.contact ? `${data.contact.firstName} ${data.contact.lastName}` : null, analysisScore: data.leadAnalysis?.leadScore ?? null, dealId: data.deal?.id ?? null } }, include: documentInclude }); await recordAuditEvent(context, { action: "DOCUMENT_GENERATED", entityType: "DOCUMENT", entityId: document.id, requestId, source: "PLATFORM", metadata: { type, source: document.source } }); return document;
}

export async function createManualDocument(context: RequestContext, input: Input, requestId: string) {
  await prepareActiveClientSync(context); const type = kind(input.type, editableKinds); const title = text(input.title); const content = text(input.content); if (!title || !content) throw new AppError("INVALID_DOCUMENT_INPUT", 422, "Document details are required.", "Enter a title and document content before saving."); const data = await documentContext(context, input); const document = await prisma.document.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, contactId: data.contactId, leadAnalysisId: data.leadAnalysisId, dealId: data.dealId, userId: context.user.id, type, source: "MANUAL", status: status(input.status), title, content, contextSnapshot: { brand: data.account.brandName } }, include: documentInclude }); await recordAuditEvent(context, { action: "DOCUMENT_CREATED", entityType: "DOCUMENT", entityId: document.id, requestId, source: "PLATFORM", metadata: { type, source: document.source } }); return document;
}

export async function updateDocument(context: RequestContext, id: string, input: Input, requestId: string) {
  await prepareActiveClientSync(context); const existing = await prisma.document.findFirst({ where: { id, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId } }); if (!existing) throw new AppError("DOCUMENT_NOT_FOUND", 404, "Document is outside active client.", "Choose a document from the active client account."); if (existing.source === "UPLOADED") throw new AppError("INVALID_DOCUMENT_INPUT", 422, "Uploaded files cannot be edited as text.", "Download the PDF, revise it, then upload the new version."); const title = input.title === undefined ? existing.title : text(input.title); const content = input.content === undefined ? existing.content : text(input.content); if (!title || !content) throw new AppError("INVALID_DOCUMENT_INPUT", 422, "Document details are required.", "Enter a title and document content before saving."); const document = await prisma.document.update({ where: { id }, data: { title, content, status: status(input.status, existing.status), isManualOverride: true }, include: documentInclude }); await recordAuditEvent(context, { action: "DOCUMENT_UPDATED", entityType: "DOCUMENT", entityId: document.id, requestId, source: "PLATFORM", metadata: { type: document.type, manualOverride: true } }); return document;
}

export async function uploadPdfDocument(context: RequestContext, input: { file: File; title?: string; contactId?: string; leadAnalysisId?: string; dealId?: string }, requestId: string) {
  await prepareActiveClientSync(context); const file = input.file; if (file.type !== "application/pdf" || file.size === 0 || file.size > 5 * 1024 * 1024) throw new AppError("DOCUMENT_FILE_INVALID", 422, "Invalid PDF file.", "Upload a non-empty PDF smaller than 5 MB."); const data = await documentContext(context, input); const document = await prisma.document.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, contactId: data.contactId, leadAnalysisId: data.leadAnalysisId, dealId: data.dealId, userId: context.user.id, type: "FILE_UPLOAD", source: "UPLOADED", status: "FINAL", title: text(input.title) || file.name, fileName: file.name, mimeType: file.type, fileData: Buffer.from(await file.arrayBuffer()), contextSnapshot: { brand: data.account.brandName, uploadedFile: file.name } }, include: documentInclude }); await recordAuditEvent(context, { action: "DOCUMENT_UPLOADED", entityType: "DOCUMENT", entityId: document.id, requestId, source: "PLATFORM", metadata: { type: document.type, bytes: file.size } }); return document;
}

export async function downloadDocument(context: RequestContext, id: string) { await prepareActiveClientSync(context); const document = await prisma.document.findFirst({ where: { id, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, select: { fileData: true, fileName: true, mimeType: true } }); if (!document || !document.fileData) throw new AppError("DOCUMENT_NOT_FOUND", 404, "Document is outside active client.", "Choose an uploaded document from the active client account."); return document; }
