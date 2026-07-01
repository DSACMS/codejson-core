export class CodeJSONValidationError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super(
      `code.json validation failed with ${errors.length} error(s):\n` +
        errors.map((e, i) => `${i + 1}. ${e}`).join("\n"),
    );
    this.name = "CodeJSONValidationError";
    this.errors = errors;
  }
}
