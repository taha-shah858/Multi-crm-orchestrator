import type {
  ClickUpDealTaskPayload,
  ClickUpTaskCreateInput,
  ClickUpTaskUpdateInput,
} from "./types";

export function formatDealCurrency(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function buildClickUpTaskTitle(payload: ClickUpDealTaskPayload): string {
  const clientPrefix = payload.clientAccountName ? `[${payload.clientAccountName}] ` : "";
  const contactPart = payload.customerName ? `${payload.customerName} — ` : "";
  return `${clientPrefix}${contactPart}${payload.dealTitle}`.trim();
}

export function buildClickUpTaskDescription(payload: ClickUpDealTaskPayload): string {
  const lines: string[] = [
    `# Closed Deal Sales Record`,
    ``,
    `**Customer:** ${payload.customerName}`,
    `**Customer Email:** ${payload.customerEmail || "N/A"}`,
    ``,
    `**Client:** ${payload.clientAccountName}`,
    `**Deal:** ${payload.dealTitle}`,
    `**Deal Value:** ${formatDealCurrency(payload.dealValueCents, payload.currency)}`,
    `**Commission Rate:** ${payload.commissionRate}%`,
    `**Expected Revenue:** ${formatDealCurrency(payload.expectedRevenueCents, payload.currency)}`,
    ``,
    `**Status:** Closed Won`,
    `**Close Date:** ${payload.closedAt ? new Date(payload.closedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]}`,
    ``,
    `**Client CRM:** ${payload.clientCrmProvider}`,
    `**Client CRM Handoff:** ${payload.handoffStatus}`,
    `**Agency Deal ID:** \`${payload.dealId}\``,
  ];

  if (payload.zohoRecordId) {
    lines.push(`**Zoho Record ID:** \`${payload.zohoRecordId}\``);
  }
  if (payload.closeOutcome) {
    lines.push(`**Close Outcome:** ${payload.closeOutcome}`);
  }
  if (payload.recommendedNextAction) {
    lines.push(`**Next Action:** ${payload.recommendedNextAction}`);
  }
  if (payload.notes) {
    lines.push(``, `### Notes & Special Instructions`, payload.notes);
  }

  return lines.join("\n");
}

export function buildClickUpTaskCreateInput(
  payload: ClickUpDealTaskPayload,
): ClickUpTaskCreateInput {
  const name = buildClickUpTaskTitle(payload);
  const markdown = buildClickUpTaskDescription(payload);

  return {
    name,
    markdown_description: markdown,
    description: markdown,
    status: "closed",
  };
}

export function buildClickUpTaskUpdateInput(
  payload: ClickUpDealTaskPayload,
): ClickUpTaskUpdateInput {
  const name = buildClickUpTaskTitle(payload);
  const markdown = buildClickUpTaskDescription(payload);

  return {
    name,
    markdown_description: markdown,
    description: markdown,
    status: "closed",
  };
}
