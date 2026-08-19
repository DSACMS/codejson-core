import { type z } from "zod";
import { validateWith, isValidWith } from "./validation.js";
import { assembleWith, mergeWith, type AssembleOptions } from "./assemble.js";
import { droppedFields } from "./normalize.js";

// a bundled variant. everything a caller needs
export interface CodeJSONProfile<T extends Record<string, unknown>> {
  readonly schema: z.ZodType<T>;
  readonly baseline: Partial<T>;
  readonly SCHEMA_VERSION: string;
  validate(input: unknown): string[];
  isValid(input: unknown): input is T;
  // assemble requires the result to be a valid, finished code.json and throws otherwise.
  // draft returns whatever the merge produced, incomplete or not, and never throws.
  assemble(
    observed: Partial<T>,
    existing: T | null,
    options?: AssembleOptions,
  ): T;
  draft(
    observed: Partial<T>, 
    existing: T | null, 
    options?: AssembleOptions
  ): T;
  droppedFields(input: Record<string, unknown> | null): string[];
}

// build a profile from a variant's schema, baseline, and version. this gives you a packaged object that holds all the functions and types you need with the agency you choose
export function createCodeJSONProfile<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  baseline: Partial<T>,
  version: string,
): CodeJSONProfile<T> {
  return {
    schema,
    baseline,
    SCHEMA_VERSION: version,
    validate: (input) => validateWith(schema, input),
    isValid: (input): input is T => isValidWith(schema, input),
    assemble: (observed, existing, options) =>
      assembleWith(schema, baseline, observed, existing, options),
    draft: (observed, existing, options) =>
      mergeWith(baseline, observed, existing, options),
    droppedFields: (input) => droppedFields(baseline, input),
  };
}
