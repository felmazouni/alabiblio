const MOJIBAKE_HINTS = ["Ã", "Â", "â", "ð"];

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  Aacute: "Á",
  Eacute: "É",
  Iacute: "Í",
  Oacute: "Ó",
  Uacute: "Ú",
  ntilde: "ñ",
  Ntilde: "Ñ",
  uuml: "ü",
  Uuml: "Ü",
};

function decodeLatin1Mojibake(value: string): string {
  const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (!entity) {
      return match;
    }

    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (entity.startsWith("#")) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return HTML_ENTITY_MAP[entity] ?? match;
  });
}

export function repairSourceText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = decodeHtmlEntities(value).replace(/\u00a0/g, " ").trim();

  if (trimmed === "") {
    return null;
  }

  let current = trimmed;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!MOJIBAKE_HINTS.some((hint) => current.includes(hint))) {
      break;
    }

    const repaired = decodeLatin1Mojibake(current);

    if (repaired === current) {
      break;
    }

    current = repaired;
  }

  return current.replace(/\s+/g, " ").trim();
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function extractNamedPathSegment(value: string | null | undefined): string | null {
  const repaired = repairSourceText(value);

  if (!repaired) {
    return null;
  }

  const lastSegment = repaired.split("/").filter(Boolean).at(-1) ?? repaired;
  return lastSegment.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function normalizePhone(value: string | null | undefined): string | null {
  const repaired = repairSourceText(value);

  if (!repaired) {
    return null;
  }

  const compact = repaired.replace(/[^\d+]/g, "");
  return compact === "" ? null : compact;
}

export function includesAny(value: string, terms: string[]): boolean {
  const search = normalizeSearch(value);

  return terms.some((term) => search.includes(term));
}

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
