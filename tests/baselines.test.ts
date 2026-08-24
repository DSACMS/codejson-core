import { describe, expect, test } from "bun:test";
import { baselineCodeJSON } from "../src/baselines/neutral.js";
import { cmsBaselineCodeJSON } from "../src/baselines/cms.js";
import { CodeJSONSchema as NeutralSchema } from "../src/schema/neutral.js";
import { CodeJSONSchema as CMSSchema } from "../src/schema/cms.js";

const baselines = [
  ["neutral", baselineCodeJSON, NeutralSchema] as const,
  ["cms", cmsBaselineCodeJSON, CMSSchema] as const,
];

describe.each(baselines)("%s baseline", (_name, baseline, schema) => {
  // a baseline is a fillable skeleton. JSON.stringify drops undefined-valued keys,
  // so any field left undefined here would vanish from a draft written to disk --
  // which is exactly the set of fields a human still has to fill in.
  test("every key survives a JSON round trip", () => {
    const roundTripped = JSON.parse(JSON.stringify(baseline)) as Record<
      string,
      unknown
    >;
    expect(Object.keys(roundTripped).sort()).toEqual(
      Object.keys(baseline).sort(),
    );
  });

  test("holds no undefined values", () => {
    const undefinedKeys = Object.entries(baseline)
      .filter(([, value]) => value === undefined)
      .map(([key]) => key);
    expect(undefinedKeys).toEqual([]);
  });

  // the blank enums are a serialization fix, not a loosening of the contract:
  // an empty baseline must still fail validation the way it always did.
  test("is not itself a valid document", () => {
    expect(schema.safeParse(baseline).success).toBe(false);
  });
});

describe("cms baseline", () => {
  test("carries the CMS organization and the CC0 license default", () => {
    expect(cmsBaselineCodeJSON.organization).toBe(
      "Centers for Medicare & Medicaid Services",
    );
    expect(cmsBaselineCodeJSON.permissions?.licenses).toEqual([
      { name: "CC0-1.0", URL: "" },
    ]);
  });
});

describe("neutral baseline", () => {
  test("carries no agency content", () => {
    expect(baselineCodeJSON.organization).toBe("");
    expect(baselineCodeJSON.permissions?.licenses).toEqual([]);
  });
});
