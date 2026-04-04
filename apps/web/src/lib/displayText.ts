const SUSPICIOUS_MOJIBAKE_PATTERN = /(?:Ã.|Â.|â.|�)/;

function decodeLatin1AsUtf8(value: string): string {
  const bytes = Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
  return new TextDecoder("utf-8").decode(bytes);
}

export function repairMojibake(value: string): string {
  if (!SUSPICIOUS_MOJIBAKE_PATTERN.test(value)) return value;

  let current = value;
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
