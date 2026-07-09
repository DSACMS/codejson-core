// drop any key not in the baseline via the baseline keys 
export function filterValidFields<T extends Record<string, unknown>>(
  baseline: Partial<T>,
  input: Record<string, unknown>,
): Partial<T> {
  const validKeys = new Set(Object.keys(baseline));
  const filtered: Record<string, unknown> = {};

  for (const key of Object.keys(input)) {
    if (validKeys.has(key)) {
      filtered[key] = input[key];
    }
  }

  return filtered as Partial<T>;
}

// reshape legacy data so it still validates. any field migration that need to happen can live here
export function migrateLegacyFields<T extends Record<string, unknown>>(
  input: Partial<T>,
): Partial<T> {
  const result = { ...input } as Record<string, unknown>;

  if (typeof result.contractNumber === "string") {
    const trimmed = result.contractNumber.trim();
    result.contractNumber = trimmed ? [trimmed] : [];
  }

  return result as Partial<T>;
}
