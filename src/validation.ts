import { z } from "zod";
import { createErrorMap } from "zod-validation-error";

z.config({ customError: createErrorMap({ displayInvalidFormatDetails: true }) });

// schema-generic validators. profiles bind these to a specific variant's schema.
export function validateWith(schema: z.ZodType, input: unknown): string[] {
  const result = schema.safeParse(input);
  return result.success ? [] : [z.prettifyError(result.error)];
}

export function isValidWith<T>(
  schema: z.ZodType<T>,
  input: unknown,
): input is T {
  return schema.safeParse(input).success;
}
