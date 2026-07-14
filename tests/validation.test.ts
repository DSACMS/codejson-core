import { describe, expect, test } from "bun:test";
import { validateWith, isValidWith } from "../src/validation.js";
import { CodeJSONSchema } from "../src/schema/neutral.js";
import { validNeutral, clone } from "./fixtures.js";

describe("validateWith", () => {
  test("returns no errors for a valid document", () => {
    expect(validateWith(CodeJSONSchema, validNeutral)).toEqual([]);
  });

  test("reports missing required fields", () => {
    const bad = clone(validNeutral) as Record<string, unknown>;
    delete bad.status;
    delete bad.maintenance;

    const errors = validateWith(CodeJSONSchema, bad);
    expect(errors.length).toBe(1); // prettifyError collapses to a single string
    expect(errors[0]).toContain("status");
    expect(errors[0]).toContain("maintenance");
  });

  test("rejects an unknown enum value", () => {
    const bad = clone(validNeutral);
    (bad as Record<string, unknown>).status = "NotAStatus";
    expect(validateWith(CodeJSONSchema, bad).length).toBeGreaterThan(0);
  });

  test("rejects a malformed repository URL", () => {
    const bad = clone(validNeutral);
    bad.repositoryURL = "not-a-url";
    expect(validateWith(CodeJSONSchema, bad).length).toBeGreaterThan(0);
  });

  test("allows an empty string for URL fields", () => {
    const ok = clone(validNeutral);
    ok.repositoryURL = "";
    ok.feedbackMechanism = "";
    expect(validateWith(CodeJSONSchema, ok)).toEqual([]);
  });

  test("enforces unique-item arrays", () => {
    const bad = clone(validNeutral);
    bad.tags = ["dup", "dup"];
    const errors = validateWith(CodeJSONSchema, bad);
    expect(errors[0]).toContain("unique");
  });

  describe("exemptionText cross-field refinement", () => {
    test("requires exemptionText when an exemption usageType is present", () => {
      const bad = clone(validNeutral);
      bad.permissions.usageType = ["exemptByFOIA"];
      bad.permissions.exemptionText = "";
      const errors = validateWith(CodeJSONSchema, bad);
      expect(errors[0]).toContain("exemptionText");
    });

    test("passes when exemptionText is supplied for an exemption", () => {
      const ok = clone(validNeutral);
      ok.permissions.usageType = ["exemptByFOIA"];
      ok.permissions.exemptionText = "Exempt because of an ongoing FOIA review.";
      expect(validateWith(CodeJSONSchema, ok)).toEqual([]);
    });

    test("does not require exemptionText for non-exempt usage", () => {
      const ok = clone(validNeutral);
      ok.permissions.usageType = ["openSource"];
      ok.permissions.exemptionText = "";
      expect(validateWith(CodeJSONSchema, ok)).toEqual([]);
    });
  });
});

describe("isValidWith", () => {
  test("narrows to true for valid input", () => {
    expect(isValidWith(CodeJSONSchema, validNeutral)).toBe(true);
  });

  test("returns false for invalid input", () => {
    expect(isValidWith(CodeJSONSchema, { name: "only-a-name" })).toBe(false);
  });
});
