import { describe, expect, test } from "bun:test";
import { assembleWith, mergeWith } from "../src/assemble.js";
import { CodeJSONSchema, type CodeJSON } from "../src/schema/neutral.js";
import { baselineCodeJSON } from "../src/baselines/neutral.js";
import { CodeJSONValidationError } from "../src/errors.js";
import { validNeutral, clone } from "./fixtures.js";

// a fixed clock so metadataLastUpdated is deterministic.
const FIXED = "2026-07-09T12:00:00.000Z";
const fixedNow = () => new Date(FIXED);

// the smallest observed input that yields a valid doc against an empty baseline.
const minimalObserved: Partial<CodeJSON> = {
  status: "Development",
  repositoryVisibility: "public",
  maintenance: "internal",
  repositoryURL: "https://github.com/x/y",
  date: { created: "2020-01-01T00:00:00Z", lastModified: "2020-06-01T00:00:00Z" },
  contact: { email: "team@example.com", name: "Team" },
};

const assemble = (
  observed: Partial<CodeJSON>,
  existing: CodeJSON | null = null,
  options = {},
) =>
  assembleWith(CodeJSONSchema, baselineCodeJSON, observed, existing, {
    now: fixedNow,
    ...options,
  });

const merge = (
  observed: Partial<CodeJSON>,
  existing: CodeJSON | null = null,
  options = {},
) =>
  mergeWith(baselineCodeJSON, observed, existing, {
    now: fixedNow,
    ...options,
  });

describe("assembleWith", () => {
  test("produces a schema-valid document from minimal observed input", () => {
    const result = assemble(minimalObserved);
    expect(CodeJSONSchema.safeParse(result).success).toBe(true);
  });

  test("throws CodeJSONValidationError when required enums are missing", () => {
    // omit maintenance -> baseline leaves it undefined -> invalid.
    const { maintenance, ...partial } = minimalObserved;
    void maintenance;
    expect(() => assemble(partial)).toThrow(CodeJSONValidationError);
  });

  test("stamps metadataLastUpdated from the injected clock", () => {
    const result = assemble(minimalObserved);
    expect(result.date.metadataLastUpdated).toBe(FIXED);
  });

  describe("field precedence (baseline < existing < observed)", () => {
    test("observed overrides existing for plain fields", () => {
      const existing = clone(validNeutral);
      existing.name = "old name";
      const result = assemble({ ...minimalObserved, name: "new name" }, existing);
      expect(result.name).toBe("new name");
    });

    test("existing supplies fields the observed input omits", () => {
      const existing = clone(validNeutral);
      existing.organization = "Preserved Org";
      const result = assemble(minimalObserved, existing);
      expect(result.organization).toBe("Preserved Org");
    });

    test("drops unknown keys carried in from an existing file", () => {
      const existing = { ...clone(validNeutral), legacyGarbage: "x" } as never;
      const result = assemble(minimalObserved, existing) as Record<string, unknown>;
      expect(result.legacyGarbage).toBeUndefined();
    });
  });

  describe("derived fields", () => {
    test("synthesizes feedbackMechanism and SBOM from the repository URL", () => {
      const result = assemble(minimalObserved);
      expect(result.feedbackMechanism).toBe("https://github.com/x/y/issues");
      expect(result.SBOM).toBe("https://github.com/x/y/network/dependencies");
    });

    test("prefers an existing feedbackMechanism / SBOM over synthesis", () => {
      const existing = clone(validNeutral);
      existing.feedbackMechanism = "https://example.com/feedback";
      existing.SBOM = "https://example.com/sbom";
      const result = assemble(minimalObserved, existing);
      expect(result.feedbackMechanism).toBe("https://example.com/feedback");
      expect(result.SBOM).toBe("https://example.com/sbom");
    });

    test("falls back to the existing description when observed is blank", () => {
      const existing = clone(validNeutral);
      existing.description = "kept description";
      const result = assemble({ ...minimalObserved, description: "   " }, existing);
      expect(result.description).toBe("kept description");
    });

    test("keeps forks from observed but clones only from existing", () => {
      const existing = clone(validNeutral);
      existing.reuseFrequency = { forks: 99, clones: 42 };
      const result = assemble(
        { ...minimalObserved, reuseFrequency: { forks: 5 } },
        existing,
      );
      expect(result.reuseFrequency.forks).toBe(5);
      expect(result.reuseFrequency.clones).toBe(42);
    });
  });

  describe("archival handling", () => {
    test("sets Archival status and appends an archived tag", () => {
      const result = assemble(
        { ...minimalObserved, tags: ["a", "b"] },
        null,
        { isArchived: true },
      );
      expect(result.status).toBe("Archival");
      expect(result.tags).toEqual(["a", "b", "archived"]);
    });

    test("does not duplicate an existing archived tag", () => {
      const result = assemble(
        { ...minimalObserved, tags: ["archived"] },
        null,
        { isArchived: true },
      );
      expect(result.tags).toEqual(["archived"]);
    });
  });
});

describe("mergeWith", () => {
  test("returns an incomplete draft where assembleWith throws", () => {
    // omit maintenance -> baseline leaves it "" -> invalid, but merging doesn't care.
    const { maintenance, ...partial } = minimalObserved;
    void maintenance;

    expect(() => assemble(partial)).toThrow(CodeJSONValidationError);

    const draft = merge(partial);
    expect(draft.maintenance).toBe("" as never);
    expect(CodeJSONSchema.safeParse(draft).success).toBe(false);
  });

  test("leaves every unsupplied enum blank rather than absent", () => {
    // the reason "" beats undefined: a draft is written to disk for a human to
    // finish, and JSON.stringify would drop the keys they need to fill in.
    const draft = merge({});
    const roundTripped = JSON.parse(JSON.stringify(draft)) as Record<
      string,
      unknown
    >;
    expect(roundTripped.status).toBe("");
    expect(roundTripped.repositoryVisibility).toBe("");
    expect(roundTripped.maintenance).toBe("");
  });

  test("matches assembleWith exactly when the input is already valid", () => {
    const observed = { ...minimalObserved, name: "same", laborHours: 12 };
    const existing = clone(validNeutral);

    expect(merge(observed, existing)).toEqual(assemble(observed, existing));
  });

  test("applies the same derived-field and archival rules", () => {
    const draft = merge({ ...minimalObserved, tags: ["a"] }, null, {
      isArchived: true,
    });
    expect(draft.feedbackMechanism).toBe("https://github.com/x/y/issues");
    expect(draft.SBOM).toBe("https://github.com/x/y/network/dependencies");
    expect(draft.date.metadataLastUpdated).toBe(FIXED);
    expect(draft.status).toBe("Archival");
    expect(draft.tags).toEqual(["a", "archived"]);
  });
});
