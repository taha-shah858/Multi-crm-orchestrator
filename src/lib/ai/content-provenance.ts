export function generationLabel(record: { source: string; contextSnapshot?: unknown }) {
  if (record.source === "MANUAL") return "Manual";
  if (record.source === "UPLOADED") return "Uploaded PDF";
  const snapshot = record.contextSnapshot as { generation?: { provider?: string } } | null;
  return snapshot?.generation?.provider === "GEMINI" ? "Gemini draft" : "Template draft";
}

export function generationMessage(record: { source: string; contextSnapshot?: unknown }) {
  const snapshot = record.contextSnapshot as { generation?: { reason?: string } } | null;
  return snapshot?.generation?.reason || `${generationLabel(record)} saved. Review and edit it before use.`;
}
