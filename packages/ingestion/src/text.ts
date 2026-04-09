// @ts-expect-error -- `he` does not ship TypeScript declarations.
import he from "he";

const SUSPICIOUS_MOJIBAKE_PATTERN = /(?:Ã.|Â.|â.|ï¿½)/;

function decodeLatin1AsUtf8(value: string): string {
  const bytes = Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
  return new TextDecoder("utf-8").decode(bytes);
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
  let current = value;

  if (!SUSPICIOUS_MOJIBAKE_PATTERN.test(current)) {
    return current;
  }

  for (let index = 0; index < maxPasses; index += 1) {
    const next = decodeLatin1AsUtf8(current);

    if (next === current) {
      break;
    }

    current = next;

    if (!SUSPICIOUS_MOJIBAKE_PATTERN.test(current)) {
      break;
    }
  }

  return current;
}

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
  const normalizedWhitespace = repaired.replace(/\s+/g, " ").trim();

  return normalizedWhitespace === "" ? null : normalizedWhitespace;
}
