import { describe, expect, test } from "bun:test";
import { filterValidFields, migrateLegacyFields } from "../src/normalize.js";

describe("filterValidFields", () => {
  const baseline = { name: "", version: "", tags: [] as string[] };

  test("keeps only keys present in the baseline", () => {
    const result = filterValidFields(baseline, {
      name: "keep",
      version: "1.0.0",
      bogus: "drop me",
      anotherUnknown: 42,
    });
    expect(result).toEqual({ name: "keep", version: "1.0.0" });
  });

  test("preserves values verbatim without validating them", () => {
    // filtering is key-based only; it does not coerce or validate values.
    const result = filterValidFields(baseline, { name: 123, tags: "not-array" });
    expect(result).toEqual({ name: 123, tags: "not-array" } as never);
  });

  test("returns an empty object when nothing matches", () => {
    expect(filterValidFields(baseline, { onlyUnknown: true })).toEqual({});
  });
});

describe("migrateLegacyFields", () => {
  test("wraps a legacy string contractNumber into an array", () => {
    expect(migrateLegacyFields({ contractNumber: "ABC-123" } as never)).toEqual({
      contractNumber: ["ABC-123"],
    } as never);
  });

  test("trims and drops an empty legacy contractNumber", () => {
    expect(migrateLegacyFields({ contractNumber: "   " } as never)).toEqual({
      contractNumber: [],
    } as never);
  });

  test("leaves an already-array contractNumber untouched", () => {
    const input = { contractNumber: ["A", "B"] } as never;
    expect(migrateLegacyFields(input)).toEqual({ contractNumber: ["A", "B"] } as never);
  });

  test("does not mutate the input object", () => {
    const input = { contractNumber: "X" } as never;
    migrateLegacyFields(input);
    expect(input).toEqual({ contractNumber: "X" } as never);
  });
});
