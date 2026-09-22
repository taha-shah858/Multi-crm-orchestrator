const blockBoundaryPattern = /<\/?(?:address|article|aside|blockquote|div|footer|h[1-6]|header|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)(?:\s[^>]*)?>/gi;
const lineBreakPattern = /<br\s*\/?>/gi;
const unsafeBlockPattern = /<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const tagPattern = /<[^>]*>/g;

function decodeEntity(entity: string) {
  const normalized = entity.toLowerCase();
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  if (named[normalized]) return named[normalized];
  const numeric = normalized.startsWith("#x")
    ? Number.parseInt(normalized.slice(2), 16)
    : normalized.startsWith("#")
      ? Number.parseInt(normalized.slice(1), 10)
      : Number.NaN;
  return Number.isFinite(numeric) && numeric > 0 && numeric <= 0x10ffff
    ? String.fromCodePoint(numeric)
    : `&${entity};`;
}

/** Converts provider rich text to safe, readable text for storage and display. */
export function normalizeRichTextToPlainText(value: string | null | undefined) {
  if (!value) return null;
  const text = value
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(unsafeBlockPattern, " ")
    .replace(lineBreakPattern, "\n")
    .replace(blockBoundaryPattern, "\n")
    .replace(tagPattern, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi, (_, entity: string) => decodeEntity(entity))
    .replace(/\u00a0/g, " ")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return text || null;
}
