import { type z } from "zod";
import { validateWith } from "./validation.js";
import { CodeJSONValidationError } from "./errors.js";
import { filterValidFields, migrateLegacyFields } from "./normalize.js";

export interface AssembleOptions {
  isArchived?: boolean;
  now?: () => Date;
}

// fields whose final value needs selection/synthesis logic, not a plain override.
// everything a caller sends that IS a plain override just flows through the spread below and does NOT belong here.
interface DerivedView {
  repositoryURL?: string;
  feedbackMechanism?: string;
  SBOM?: string;
  description?: string;
  tags?: string[];
  status?: string;
  reuseFrequency?: { forks?: number; clones?: number };
  date?: { created?: string; lastModified?: string; metadataLastUpdated?: string };
}

// merge then validate everything into one valid code.json
// baseline -> cleaned existing file -> freshly observed -> derived (later wins)
// this is meant to be a pure function with no i/o
export function assembleWith<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
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

  // step 2: compute the derived fields.
  const obs = observed as unknown as DerivedView;
  const ex = (existing ?? {}) as unknown as DerivedView;

  const repoURL = obs.repositoryURL ?? ex.repositoryURL ?? "";

  const feedbackMechanism = ex.feedbackMechanism
    ? ex.feedbackMechanism
    : `${repoURL}/issues`;

  const SBOM = ex.SBOM ? ex.SBOM : `${repoURL}/network/dependencies`;

  const description =
    obs.description && obs.description.trim() !== ""
      ? obs.description
      : (ex.description ?? "");

  const baseTags = obs.tags && obs.tags.length > 0 ? obs.tags : (ex.tags ?? []);
  const tags =
    isArchived && !baseTags.includes("archived")
      ? [...baseTags, "archived"]
      : baseTags;

  const reuseFrequency = {
    forks: obs.reuseFrequency?.forks ?? ex.reuseFrequency?.forks ?? 0,
    clones: ex.reuseFrequency?.clones ?? 0,
  };

  const date = {
    created: obs.date?.created ?? ex.date?.created ?? "",
    lastModified: obs.date?.lastModified ?? ex.date?.lastModified ?? "",
    metadataLastUpdated: (now?.() ?? new Date()).toISOString(),
  };

  const derived: Record<string, unknown> = {
    feedbackMechanism,
    SBOM,
    description,
    tags,
    reuseFrequency,
    date,
  };

  if (isArchived) derived.status = "Archival";

  // step 3: merge with precedence (later wins).
  const result = {
    ...baseline,
    ...cleanedExisting,
    ...observed,
    ...derived,
  };

  // step 4: validate.
  const errors = validateWith(schema, result);
  if (errors.length > 0) throw new CodeJSONValidationError(errors);

  return result as unknown as T;
}
