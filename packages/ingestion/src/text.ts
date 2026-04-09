// @ts-expect-error -- `he` does not ship TypeScript declarations.
import he from "he";

const SUSPICIOUS_MOJIBAKE_PATTERN = /(?:\u00c3|\u00c2|\u00e2\u20ac|\ufffd)/u;
const MAX_SUSPICIOUS_FINDINGS = 5;

export type SuspiciousTextFinding = {
  field: string;
  rawSnippet: string;
};

function decodeLatin1AsUtf8(value: string): string {
  const bytes = Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
  return new TextDecoder("utf-8").decode(bytes);
}

function repairSuspiciousToken(value: string, maxPasses: number): string {
  let current = value;
  let suspiciousMarkers = countSuspiciousMarkers(current);

  if (suspiciousMarkers === 0) {
    return current;
  }

  for (let index = 0; index < maxPasses; index += 1) {
    const next = decodeLatin1AsUtf8(current);
    const nextSuspiciousMarkers = countSuspiciousMarkers(next);

    if (next === current || nextSuspiciousMarkers > suspiciousMarkers) {
      break;
    }

    current = next;
    suspiciousMarkers = nextSuspiciousMarkers;

    if (suspiciousMarkers === 0) {
      break;
    }
  }

  return current;
}

function countSuspiciousMarkers(value: string): number {
  return value.match(new RegExp(SUSPICIOUS_MOJIBAKE_PATTERN, "gu"))?.length ?? 0;
}

function normalizeUnicode(value: string): string {
  return value.normalize("NFC");
}

function buildRawSnippet(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function containsSuspiciousText(value: string | null | undefined): boolean {
  return typeof value === "string" && SUSPICIOUS_MOJIBAKE_PATTERN.test(value);
}

export function findSuspiciousTextEntries(
  value: unknown,
  options: { maxFindings?: number } = {},
): SuspiciousTextFinding[] {
  const findings: SuspiciousTextFinding[] = [];
  const visited = new WeakSet<object>();
  const maxFindings = options.maxFindings ?? MAX_SUSPICIOUS_FINDINGS;

  const visit = (candidate: unknown, field: string): void => {
    if (findings.length >= maxFindings) {
      return;
    }

    if (typeof candidate === "string") {
      if (containsSuspiciousText(candidate)) {
        findings.push({
          field,
          rawSnippet: buildRawSnippet(candidate),
        });
      }
      return;
    }

    if (!candidate || typeof candidate !== "object") {
      return;
    }

    if (visited.has(candidate)) {
      return;
    }

    visited.add(candidate);

    if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => {
        visit(item, `${field}[${index}]`);
      });
      return;
    }

    for (const [key, nestedValue] of Object.entries(candidate)) {
      visit(nestedValue, field === "" ? key : `${field}.${key}`);
      if (findings.length >= maxFindings) {
        break;
      }
    }
  };

  visit(value, "");

  return findings;
}

export function decodeHtmlEntitiesRepeatedly(value: string, maxPasses = 3): string {
  let current = value;

  for (let index = 0; index < maxPasses; index += 1) {
    const next = he.decode(current);

    if (next === current) {
      break;
    }

    current = next;
  }

  return current;
}

export function repairUtf8Mojibake(value: string, maxPasses = 2): string {
  if (!containsSuspiciousText(value)) {
    return value;
  }

  return value
    .split(/(\s+)/u)
    .map((token) => (/^\s+$/u.test(token) ? token : repairSuspiciousToken(token, maxPasses)))
    .join("");
}

/**
 * Contract for all external text entering the system.
 *
 * Order:
 * 1. Decode repeated HTML entities.
 * 2. Repair common UTF-8/latin1 mojibake conservatively.
 * 3. Normalize Unicode to NFC.
 * 4. Collapse repeated whitespace and trim.
 *
 * Guarantees:
 * - idempotent: normalizeSourceText(normalizeSourceText(x)) === normalizeSourceText(x)
 * - returns null for non-string or empty input
 *
 * It does not:
 * - transliterate or strip accents
 * - translate, title-case, or infer semantics
 * - rewrite punctuation beyond Unicode normalization
 * - "fix" arbitrary strings that do not match known mojibake markers
 */
export function normalizeSourceText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  const decodedEntities = decodeHtmlEntitiesRepeatedly(trimmed);
  const repaired = repairUtf8Mojibake(decodedEntities);
  const normalizedUnicode = normalizeUnicode(repaired);
  const normalizedWhitespace = normalizedUnicode.replace(/\s+/g, " ").trim();

  return normalizedWhitespace === "" ? null : normalizedWhitespace;
}
