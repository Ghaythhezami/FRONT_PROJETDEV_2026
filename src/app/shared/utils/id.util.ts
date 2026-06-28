/** Accepts any canonical 8-4-4-4-12 hex UUID (including dev seed IDs). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return !!value && UUID_RE.test(value);
}

/** Picks the first valid UUID from known backend property names. */
export function extractUuid(raw: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && isUuid(value)) {
      return value;
    }
  }
  return '';
}
