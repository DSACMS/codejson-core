import { describe, expect, test } from "bun:test";
import {
  validateCodeJSON,
  isValidCodeJSON,
  assembleCodeJSON,
  filterValidFields,
  neutralProfile,
  cmsProfile,
  createCodeJSONProfile,
  SCHEMA_VERSION,
  CMS_SCHEMA_VERSION,
} from "../src/index.js";
import { validNeutral, clone } from "./fixtures.js";

describe("public neutral-bound API", () => {
  test("validateCodeJSON accepts a valid document", () => {
    expect(validateCodeJSON(validNeutral)).toEqual([]);
  });

  test("isValidCodeJSON narrows valid input", () => {
    expect(isValidCodeJSON(validNeutral)).toBe(true);
    expect(isValidCodeJSON({})).toBe(false);
  });

  test("assembleCodeJSON runs end-to-end with the neutral baseline", () => {
    const result = assembleCodeJSON(
      {
        status: "Beta",
        repositoryVisibility: "public",
        maintenance: "community",
        repositoryURL: "https://github.com/a/b",
        date: { created: "2020-01-01T00:00:00Z", lastModified: "2020-06-01T00:00:00Z" },
        contact: { email: "team@example.com", name: "Team" },
      },
      null,
    );
    expect(isValidCodeJSON(result)).toBe(true);
  });

  test("filterValidFields is pre-bound to the neutral baseline", () => {
    const filtered = filterValidFields({ name: "ok", notARealField: true });
    expect(filtered).toEqual({ name: "ok" });
  });

  test("exposes the pinned schema version", () => {
    expect(SCHEMA_VERSION).toBe("2.0.0");
  });
});

describe("profiles", () => {
  test("neutralProfile.validate matches the top-level export", () => {
    expect(neutralProfile.validate(validNeutral)).toEqual([]);
  });

  test("cmsProfile carries its own baseline and version", () => {
    expect(cmsProfile.SCHEMA_VERSION).toBe(CMS_SCHEMA_VERSION);
    expect(cmsProfile.baseline.organization).toBe(
      "Centers for Medicare & Medicaid Services",
    );
  });

  test("cmsProfile rejects a document missing CMS-specific required fields", () => {
    // the neutral fixture lacks CMS-only fields, so it should not validate as CMS.
    expect(cmsProfile.validate(clone(validNeutral)).length).toBeGreaterThan(0);
  });
});

describe("createCodeJSONProfile", () => {
  test("bundles schema, baseline, and version into one object", () => {
    const profile = createCodeJSONProfile(
      neutralProfile.schema,
      { name: "" },
      "9.9.9",
    );
    expect(profile.SCHEMA_VERSION).toBe("9.9.9");
    expect(profile.validate(validNeutral)).toEqual([]);
    expect(profile.isValid(validNeutral)).toBe(true);
  });
});
