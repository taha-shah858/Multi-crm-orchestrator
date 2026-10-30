import { recordAuditEvent } from "@/lib/audit/audit-log";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";
import { generateGeminiContent, writingBrief } from "@/lib/ai/gemini-content";
import { listAiClientContacts, requireAiClientContact } from "@/lib/ai/client-contacts";

type ScriptInput = Record<string, unknown>;
type Channel = "CALL" | "SMS" | "EMAIL";

export const scriptTemplates = [
  { key: "FOLLOW_UP", name: "Discovery follow-up", channel: "EMAIL" as const, purpose: "Follow up after a discovery conversation" },
  { key: "VALUE_CHECK", name: "Value check-in", channel: "SMS" as const, purpose: "Confirm value and agree a next step" },
  { key: "OBJECTION", name: "Objection-handling call", channel: "CALL" as const, purpose: "Address an identified objection" },
];

function channel(value: unknown): Channel {
  if (value === "CALL" || value === "SMS" || value === "EMAIL") return value;
  throw new AppError("INVALID_SCRIPT_INPUT", 422, "Invalid script channel.", "Choose a call, SMS, or email script.");
}

async function contextFor(context: RequestContext, input: ScriptInput) {
  const contactId = typeof input.contactId === "string" && input.contactId ? input.contactId : null;
  const analysisId = typeof input.leadAnalysisId === "string" && input.leadAnalysisId ? input.leadAnalysisId : null;
  const [account, requestedContact, analysis] = await Promise.all([
    prisma.clientAccount.findFirst({ where: { id: context.activeClientAccountId, organizationId: context.user.organizationId }, select: { name: true, brandName: true } }),
    contactId ? requireAiClientContact(context, contactId) : null,
    analysisId ? prisma.leadAnalysis.findFirst({ where: { id: analysisId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId } }) : null,
  ]);
  if (!account) throw new AppError("CLIENT_CONTEXT_REQUIRED", 404, "Active client account was not found.", "Select an active client account before creating a script.");
  if (contactId && !requestedContact) throw new AppError("CONTACT_NOT_FOUND", 404, "Contact is outside active client.", "Choose a contact from the active client account.");
  if (analysisId && !analysis) throw new AppError("LEAD_ANALYSIS_NOT_FOUND", 404, "Analysis is outside active client.", "Choose an analysis from the active client account.");
  if (requestedContact && analysis?.contactId && requestedContact.id !== analysis.contactId) {
    throw new AppError("LEAD_ANALYSIS_LINK_MISMATCH", 422, "Contact and lead analysis do not match.", "Use the contact associated with the selected lead analysis.");
  }
  const contact = requestedContact ?? (analysis?.contactId
    ? await requireAiClientContact(context, analysis.contactId)
    : null);
  // An account-level draft must not borrow an unrelated prospect's conversation.
  const interactions = contact ? await prisma.interaction.findMany({ where: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, contactId: contact.id }, orderBy: { occurredAt: "desc" }, take: 5, select: { type: true, body: true, occurredAt: true } }) : [];
  return { account, contact, analysis, interactions };
}

function generatedContent(channel: Channel, purpose: string, data: Awaited<ReturnType<typeof contextFor>>) {
  const firstName = data.contact?.firstName ?? "there";
  const brand = data.account.brandName;
  const requirement = data.analysis?.requirements ?? "your priorities";
  const objection = data.analysis?.objections && data.analysis.objections !== "None detected" ? `I also wanted to address ${data.analysis.objections}.` : "";
  const nextStep = data.analysis?.timeline ? `Could we align on a next step ${data.analysis.timeline}?` : "Would a short follow-up conversation this week work?";
  if (channel === "SMS") return `Hi ${firstName}, this is [Your name] from ${brand}. I’m following up on ${requirement}. ${objection} ${nextStep}`.replace(/\s+/g, " ").trim();
  if (channel === "EMAIL") return `Subject: Follow-up from ${brand}\n\nHi ${firstName},\n\nThank you for the conversation about ${requirement}. ${objection}\n\n${nextStep}\n\nBest,\n[Your name]\n${brand}`.replace(/\s+\n/g, "\n");
  return `Opening\nHi ${firstName}, this is [Your name] from ${brand}. I’m calling about ${purpose.toLowerCase()}.\n\nContext\nI understand ${requirement} is important. ${objection}\n\nNext step\n${nextStep}`.replace(/\s+\n/g, "\n");
}

export async function listSalesScripts(context: RequestContext) {
  await prepareActiveClientSync(context);
  const contacts = await listAiClientContacts(context);
  return prisma.salesScript.findMany({ where: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, OR: [{ contactId: null }, { contactId: { in: contacts.map(contact => contact.id) } }] }, include: { contact: { select: { id: true, firstName: true, lastName: true, company: true } }, leadAnalysis: { select: { id: true, leadScore: true, temperature: true } } }, orderBy: { updatedAt: "desc" }, take: 100 });
}

export async function generateSalesScript(context: RequestContext, input: ScriptInput, requestId: string) {
  await prepareActiveClientSync(context);
  const selectedTemplate = scriptTemplates.find((template) => template.key === input.templateKey);
  const selectedChannel = channel(input.channel ?? selectedTemplate?.channel);
  const purpose = typeof input.purpose === "string" && input.purpose.trim() ? input.purpose.trim() : selectedTemplate?.purpose;
  if (!purpose) throw new AppError("INVALID_SCRIPT_INPUT", 422, "Script purpose is required.", "Choose a template or enter the purpose for this script.");
  if (purpose.length > 1000) throw new AppError("INVALID_SCRIPT_INPUT", 422, "Script purpose is too long.", "Keep the script purpose under 1,000 characters.");
  const brief = writingBrief(input.brief);
  const data = await contextFor(context, input);
  const generated = await generateGeminiContent(selectedChannel, {
    client: data.account, purpose, brief,
    prospect: data.contact ? { firstName: data.contact.firstName, lastName: data.contact.lastName, company: data.contact.company } : null,
    analysis: data.analysis ? { summary: data.analysis.summary, requirements: data.analysis.requirements, timeline: data.analysis.timeline, objections: data.analysis.objections, intent: data.analysis.intent, reviewedByAgent: data.analysis.isManualOverride } : null,
    recentConversations: data.interactions.map(item => ({ ...item, body: item.body?.slice(0, 6000), excerpt: (item.body?.length ?? 0) > 6000 })),
  });
  const content = generated.content ?? generatedContent(selectedChannel, purpose, data);
  const script = await prisma.salesScript.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, contactId: data.contact?.id, leadAnalysisId: data.analysis?.id, userId: context.user.id, channel: selectedChannel, source: generated.content ? "GENERATED" : "TEMPLATE", templateKey: selectedTemplate?.key, title: `${selectedChannel} · ${data.contact ? `${data.contact.firstName} ${data.contact.lastName}` : data.account.brandName}`, purpose, content, contextSnapshot: { brand: data.account.brandName, interactionCount: data.interactions.length, analysisScore: data.analysis?.leadScore ?? null, brief, generation: generated.generation } } });
  await recordAuditEvent(context, { action: "SCRIPT_CREATED", entityType: "SALES_SCRIPT", entityId: script.id, requestId, source: "PLATFORM", metadata: { channel: script.channel, source: script.source, templateKey: script.templateKey } });
  return script;
}

export async function createManualSalesScript(context: RequestContext, input: ScriptInput, requestId: string) {
  await prepareActiveClientSync(context);
  const selectedChannel = channel(input.channel);
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const purpose = typeof input.purpose === "string" ? input.purpose.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (!title || !purpose || !content) throw new AppError("INVALID_SCRIPT_INPUT", 422, "Manual script details are required.", "Enter a title, purpose, and script content before saving.");
  const data = await contextFor(context, input);
  const script = await prisma.salesScript.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, contactId: data.contact?.id, leadAnalysisId: data.analysis?.id, userId: context.user.id, channel: selectedChannel, source: "MANUAL", title, purpose, content, contextSnapshot: { brand: data.account.brandName } } });
  await recordAuditEvent(context, { action: "SCRIPT_CREATED", entityType: "SALES_SCRIPT", entityId: script.id, requestId, source: "PLATFORM", metadata: { channel: script.channel, source: script.source } });
  return script;
}

export async function updateSalesScript(context: RequestContext, id: string, input: ScriptInput, requestId: string) {
  await prepareActiveClientSync(context);
  const existing = await prisma.salesScript.findFirst({ where: { id, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId } });
  if (!existing) throw new AppError("SCRIPT_NOT_FOUND", 404, "Script is outside active client.", "Choose a script from the active client account.");
  if (existing.contactId) await requireAiClientContact(context, existing.contactId);
  const text = (value: unknown, fallback: string) => typeof value === "string" && value.trim() ? value.trim() : fallback;
  const script = await prisma.salesScript.update({ where: { id }, data: { title: text(input.title, existing.title), purpose: text(input.purpose, existing.purpose), content: text(input.content, existing.content), isManualOverride: true } });
  await recordAuditEvent(context, { action: "SCRIPT_UPDATED", entityType: "SALES_SCRIPT", entityId: script.id, requestId, source: "PLATFORM", metadata: { channel: script.channel, manualOverride: true } });
  return script;
}
