const MOJIBAKE_HINTS = ["Ã", "Â", "â", "€", "™"];

function decodeLatin1Mojibake(value: string): string {
  const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export function repairSourceText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.replace(/\u00a0/g, " ").trim();

  if (trimmed === "") {
    return null;
  }

  let current = trimmed;

  for (let attempt = 0; attempt < 2; attempt += 1) {
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
  const search = value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();

  return terms.some((term) => search.includes(term));
}
