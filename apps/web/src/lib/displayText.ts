const SUSPICIOUS_MOJIBAKE_PATTERN = /(?:Ã.|Â.|â.|�)/;
const HTML_ENTITY_PATTERN = /&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g;

const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&quot;": "\"",
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
  "&Aacute;": "Á",
  "&Eacute;": "É",
  "&Iacute;": "Í",
  "&Oacute;": "Ó",
  "&Uacute;": "Ú",
  "&aacute;": "á",
  "&eacute;": "é",
  "&iacute;": "í",
  "&oacute;": "ó",
  "&uacute;": "ú",
  "&Ntilde;": "Ñ",
  "&ntilde;": "ñ",
  "&Uuml;": "Ü",
  "&uuml;": "ü",
};

function decodeLatin1AsUtf8(value: string): string {
  const bytes = Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
  return new TextDecoder("utf-8").decode(bytes);
}

function decodeHtmlEntities(value: string): string {
  if (!value.includes("&")) return value;

  return value.replace(HTML_ENTITY_PATTERN, (entity) => {
    const namedEntity = HTML_ENTITY_MAP[entity];
    if (namedEntity !== undefined) {
      return namedEntity;
    }

    if (entity.startsWith("&#x") || entity.startsWith("&#X")) {
      const codePoint = Number.parseInt(entity.slice(3, -1), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    if (entity.startsWith("&#")) {
      const codePoint = Number.parseInt(entity.slice(2, -1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    return entity;
  });
}

export function repairMojibake(value: string): string {
  let current = decodeHtmlEntities(value);

  if (!SUSPICIOUS_MOJIBAKE_PATTERN.test(current)) {
    return current
      .replace(/\u00a0/g, " ")
      .replace(/\s+\|\s+/g, " | ")
      .trim();
  }

  for (let index = 0; index < 2; index += 1) {
    const next = decodeLatin1AsUtf8(current);
    if (next === current) break;
    current = next;
    if (!SUSPICIOUS_MOJIBAKE_PATTERN.test(current)) break;
  }

  return current
    .replace(/\u00a0/g, " ")
    .replace(/\s+\|\s+/g, " | ")
    .trim();
}

export function sanitizeApiPayload<T>(value: T): T {
  if (typeof value === "string") {
    return repairMojibake(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeApiPayload(item)) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([key, nested]) => [key, sanitizeApiPayload(nested)]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}
