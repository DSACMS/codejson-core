import { type z } from "zod";
import { validateWith, isValidWith } from "./validation.js";
import { assembleWith, type AssembleOptions } from "./assemble.js";

// a bundled variant. everything a caller needs
export interface CodeJSONProfile<T extends Record<string, unknown>> {
  readonly schema: z.ZodType<T>;
  readonly baseline: Partial<T>;
  readonly SCHEMA_VERSION: string;
  validate(input: unknown): string[];
  isValid(input: unknown): input is T;
  assemble(
    observed: Partial<T>,
    existing: T | null,
    options?: AssembleOptions<T>,
  ): T;
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
  };
}
