import { type z } from "zod";
import { validateWith } from "./validation.js";
import { CodeJSONValidationError } from "./errors.js";
import { filterValidFields, migrateLegacyFields } from "./normalize.js";

export interface AssembleOptions {
  isArchived?: boolean;
  now?: () => Date;
}

type Policy = "existing" | "observed" | "union";

// who wins when both sides have a value. anything unlisted is "existing"
const POLICY: Record<string, Policy> = {
  repositoryURL: "observed",
  repositoryVisibility: "observed",
  laborHours: "observed",
  "reuseFrequency.forks": "observed",
  "date.created": "observed",
  "date.lastModified": "observed",
  tags: "union",
  reusedCode: "union",
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// a value still sitting at its baseline default counts as unset, so detection can fill it
const isUnset = (value: unknown, base: unknown): boolean =>
  value === undefined ||
  value === null ||
  JSON.stringify(value) === JSON.stringify(base);

const sameText = (a: unknown, b: unknown): boolean =>
  typeof a === "string" &&
  typeof b === "string" &&
  a !== "" &&
  a.toLowerCase() === b.toLowerCase();

// objects like reusedCode entries match on URL or name
const sameItem = (a: unknown, b: unknown): boolean =>
  isPlainObject(a) && isPlainObject(b)
    ? sameText(a.URL, b.URL) || sameText(a.name, b.name)
    : a === b;

function union(existing: unknown, observed: unknown): unknown[] {
  const result = Array.isArray(existing) ? [...existing] : [];
  for (const item of Array.isArray(observed) ? observed : []) {
    if (!result.some((kept) => sameItem(kept, item))) result.push(item);
  }
  return result;
}

function mergeValue(
  path: string,
  base: unknown,
  existing: unknown,
  observed: unknown,
): unknown {
  const objects = [base, existing, observed].filter(isPlainObject);

  if (objects.length > 0) {
    const child = (value: unknown, key: string) =>
      isPlainObject(value) ? value[key] : undefined;
    const result: Record<string, unknown> = {};

    for (const key of new Set(objects.flatMap(Object.keys))) {
      const value = mergeValue(
        path ? `${path}.${key}` : key,
        child(base, key),
        child(existing, key),
        child(observed, key),
      );
      if (value !== undefined) result[key] = value;
    }

    return result;
  }

  const policy = POLICY[path] ?? "existing";
  if (policy === "union") return union(existing, observed);

  const [first, second] =
    policy === "existing" ? [existing, observed] : [observed, existing];
  if (!isUnset(first, base)) return first;
  if (!isUnset(second, base)) return second;
  return base;
}

// merge everything into one code.json. never throws meaning the result may be an incomplete draft.
// manual values in the existing file win unless POLICY says the field is observed or unioned.
// this is meant to be a pure function with no i/o
export function mergeWith<T extends Record<string, unknown>>(
  baseline: Partial<T>,
  observed: Partial<T>,
  existing: T | null,
  options: AssembleOptions = {},
): T {
  const { isArchived = false, now } = options;

  // step 1: prep existing by dropping unknown fields then migrate legacy shapes.
  const cleanedExisting: Partial<T> = existing
    ? migrateLegacyFields(
        filterValidFields(baseline, existing as Record<string, unknown>),
      )
    : {};

  // observed keys the variant doesn't define are dropped silently
  const cleanedObserved = filterValidFields(
    baseline,
    observed as Record<string, unknown>,
  );

  // step 2: merge field by field.
  const result = mergeValue(
    "",
    baseline,
    cleanedExisting,
    cleanedObserved,
  ) as Record<string, unknown>;

  // step 3: fill in what can be computed from the merged result.
  const repoURL = result.repositoryURL ?? "";
  if (!result.feedbackMechanism) result.feedbackMechanism = `${repoURL}/issues`;
  if (!result.SBOM) result.SBOM = `${repoURL}/network/dependencies`;

  result.date = {
    ...(isPlainObject(result.date) ? result.date : {}),
    metadataLastUpdated: (now?.() ?? new Date()).toISOString(),
  };

  if (isArchived) {
    const tags = Array.isArray(result.tags) ? result.tags : [];
    result.status = "Archival";
    result.tags = tags.includes("archived") ? tags : [...tags, "archived"];
  }

  return result as T;
}

// merge, then require the result to be a valid, finished code.json.
export function assembleWith<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  baseline: Partial<T>,
  observed: Partial<T>,
  existing: T | null,
  options: AssembleOptions = {},
): T {
  const result = mergeWith(baseline, observed, existing, options);

  const errors = validateWith(schema, result);
  if (errors.length > 0) throw new CodeJSONValidationError(errors);

  return result;
}
