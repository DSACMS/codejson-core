# Examples — using `codejson-core`

Practical, copy-pasteable recipes for the common ways `codejson-core` gets used. For *how the library works internally* (the assembly flow, precedence rules, derived fields), see [`README.md`](./README.md).

**The one thing to remember:** core is pure — it never touches the network, filesystem, or GitHub. *You* (the caller) acquire the data and handle the I/O; core merges, derives, validates, and either returns a complete `CodeJSON` or throws.

---

## Contents

1. [Assemble a code.json (the main use case)](#1-assemble-a-codejson-the-main-use-case)
2. [First-time generation (no existing file)](#2-first-time-generation-no-existing-file)
3. [Validate an existing file (a CLI `validate` command)](#3-validate-an-existing-file-a-cli-validate-command)
4. [Type-guard unknown data with `isValidCodeJSON`](#4-type-guard-unknown-data-with-isvalidcodejson)
5. [Archived repositories](#5-archived-repositories)
6. [Deterministic output in tests (injectable clock)](#6-deterministic-output-in-tests-injectable-clock)
7. [Cleaning stale / legacy data by hand](#7-cleaning-stale--legacy-data-by-hand)
8. [Using the CMS variant](#8-using-the-cms-variant)
9. [Adding your own agency (zero core changes)](#9-adding-your-own-agency-zero-core-changes)
10. [End-to-end: a GitHub Action](#10-end-to-end-a-github-action)

---

## 1. Assemble a code.json (the main use case)

A consumer does the messy I/O — reads the existing `code.json`, hits the GitHub API, counts labor hours — then hands core the *plain data*. Core merges it with the existing file, computes derived fields, and validates.

```ts
import {
  assembleCodeJSON,          // neutral-bound default
  CodeJSONValidationError,
  type CodeJSON,
} from "@cmsopensource/codejson-core";

// 1. The CALLER acquires these — core never does I/O. Org-level content
//    (organization, default license) lives in your data or a profile
//    baseline, NOT in core.
const existing: CodeJSON | null = readCodeJsonFromDisk();   // current file, or null
const observed: Partial<CodeJSON> = {                       // freshly acquired facts
  name: "my-repo",
  organization: "Centers for Medicare & Medicaid Services",
  repositoryURL: "https://github.com/DSACMS/my-repo",
  permissions: { licenses: [{ name: "CC0-1.0", URL: "..." }], usageType: ["openSource"] },
  laborHours: 1200,
  languages: ["TypeScript"],
  date: { lastModified: "2026-07-01T00:00:00.000Z" },
};

// 2. Core merges, derives, and validates — or throws.
try {
  const result = assembleCodeJSON(observed, existing, { isArchived: false });
  writeCodeJsonToDisk(result);   // caller handles output
} catch (err) {
  if (err instanceof CodeJSONValidationError) {
    console.error(err.message);  // human-readable summary
    console.error(err.errors);   // structured list — fail the PR, exit nonzero, etc.
  }
  throw err;
}
```

**What core fills in for you** (from `observed` + `existing`): `feedbackMechanism` (`…/issues`), `SBOM` (`…/network/dependencies`), `reuseFrequency`, `date.metadataLastUpdated` (set to *now*), and archival `tags`/`status`. See the precedence table in [`README.md`](./README.md).

---

## 2. First-time generation (no existing file)

There's no existing `code.json` yet — pass `null`. Core starts from the baseline skeleton and fills the rest from your observed data.

```ts
import { assembleCodeJSON, type CodeJSON } from "@cmsopensource/codejson-core";

const fresh = assembleCodeJSON(
  {
    name: "brand-new-repo",
    organization: "Centers for Medicare & Medicaid Services",
    repositoryURL: "https://github.com/DSACMS/brand-new-repo",
    permissions: { licenses: [{ name: "CC0-1.0", URL: "https://…" }], usageType: ["openSource"] },
    laborHours: 0,
    languages: ["Go"],
  },
  null,   // ← no existing file
);
```

> **Heads up — the expected throw.** A valid `code.json` cannot exist without a repository URL. If `repositoryURL` isn't present in `observed` *or* `existing`, the derived `feedbackMechanism`/`SBOM` become `/issues` and `/network/dependencies`, which fail URL validation and core throws `CodeJSONValidationError`. That's intended — supplying `repositoryURL` is your job.

---

## 3. Validate an existing file (a CLI `validate` command)

`validateCodeJSON` is pure validation — no merging, no I/O. It returns a `string[]`; an **empty array means valid**. Perfect for a `validate` subcommand or a CI gate.

```ts
import { validateCodeJSON } from "@cmsopensource/codejson-core";

const raw = JSON.parse(fs.readFileSync("code.json", "utf8"));
const problems = validateCodeJSON(raw);

if (problems.length > 0) {
  console.error("code.json is invalid:\n" + problems.join("\n"));
  process.exit(1);
}
console.log("code.json is valid ✓");
```

---

## 4. Type-guard unknown data with `isValidCodeJSON`

When you want a *typed* value out of `unknown` (e.g. after parsing JSON from an API), `isValidCodeJSON` is a TypeScript type guard: inside the `if`, the value narrows to `CodeJSON`.

```ts
import { isValidCodeJSON, type CodeJSON } from "@cmsopensource/codejson-core";

function loadTyped(raw: unknown): CodeJSON {
  if (isValidCodeJSON(raw)) {
    return raw;            // ← narrowed to CodeJSON here
  }
  throw new Error("not a valid code.json");
}
```

Use `validateCodeJSON` when you want *why* it's invalid; use `isValidCodeJSON` when you only need a yes/no with type narrowing.

---

## 5. Archived repositories

Pass `isArchived: true` and core sets `status` to `"Archival"` and appends `"archived"` to `tags` (once — it won't duplicate).

```ts
import { assembleCodeJSON } from "@cmsopensource/codejson-core";

const result = assembleCodeJSON(observed, existing, { isArchived: true });
// result.status === "Archival"
// result.tags includes "archived"
```

---

## 6. Deterministic output in tests (injectable clock)

`date.metadataLastUpdated` is always stamped with the current time. For reproducible snapshots, inject a fixed clock via `now`.

```ts
import { assembleCodeJSON } from "@cmsopensource/codejson-core";

const FIXED = new Date("2026-01-01T00:00:00.000Z");

const result = assembleCodeJSON(observed, existing, {
  now: () => FIXED,   // metadataLastUpdated becomes deterministic
});

expect(result.date.metadataLastUpdated).toBe("2026-01-01T00:00:00.000Z");
```

---

## 7. Cleaning stale / legacy data by hand

`assembleCodeJSON` already runs these internally, but they're exported for when you need them standalone (e.g. a migration script).

```ts
import { filterValidFields, migrateLegacyFields } from "@cmsopensource/codejson-core";

// Drop any key that isn't part of the schema (stale/unknown fields):
const clean = filterValidFields(rawFromDisk);

// Reshape legacy shapes so old files still validate
// (e.g. contractNumber: string  →  contractNumber: string[]):
const migrated = migrateLegacyFields(clean);
```

Both are pure and immutable — they return new objects and never mutate the input.

---

## 8. Using the CMS variant

The CMS profile bundles the CMS schema + baseline (extra fields like `fismaLevel`, `maturityModelTier`) with `validate` / `isValid` / `assemble` pre-bound. Same API surface as the default, just CMS-flavored.

```ts
import { cmsProfile, type CMSCodeJSON } from "@cmsopensource/codejson-core";

const result: CMSCodeJSON = cmsProfile.assemble(observed, existing, { isArchived: false });

const problems = cmsProfile.validate(rawFromDisk);   // [] means valid
if (cmsProfile.isValid(rawFromDisk)) {
  // rawFromDisk is narrowed to CMSCodeJSON
}

// The bundled bits are on the profile too:
cmsProfile.schema;          // the Zod schema
cmsProfile.baseline;        // the skeleton
cmsProfile.SCHEMA_VERSION;  // the pinned version
```

---

## 9. Adding your own agency (zero core changes)

Every profile is just `schema + baseline + version`. To add an agency variant, generate a schema, write a baseline skeleton, and bundle them with `createCodeJSONProfile` — no changes to core.

```ts
import { createCodeJSONProfile } from "@cmsopensource/codejson-core";
import { CodeJSONSchema, SCHEMA_VERSION } from "./schema/my-agency.js";
import { myAgencyBaseline } from "./baselines/my-agency.js";

export const myAgencyProfile = createCodeJSONProfile(
  CodeJSONSchema,
  myAgencyBaseline,
  SCHEMA_VERSION,
);

// Then use it exactly like cmsProfile:
const result = myAgencyProfile.assemble(observed, existing);
```

See [`README.md`](./README.md) for how schemas and baselines are structured.

---

## 10. End-to-end: a GitHub Action

Putting it together — the caller owns all I/O; core is the pure validated-assembly step in the middle.

```ts
import {
  assembleCodeJSON,
  CodeJSONValidationError,
  type CodeJSON,
} from "@cmsopensource/codejson-core";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

async function run() {
  // 1. Read the existing file (or null on first run) — caller's I/O.
  const existing: CodeJSON | null = existsSync("code.json")
    ? JSON.parse(readFileSync("code.json", "utf8"))
    : null;

  // 2. Observe fresh facts from the GitHub API — caller's I/O.
  const repo = await octokit.repos.get({ owner, repo: name });
  const observed: Partial<CodeJSON> = {
    name: repo.data.name,
    organization: "Centers for Medicare & Medicaid Services",
    repositoryURL: repo.data.html_url,
    description: repo.data.description ?? "",
    languages: Object.keys(await fetchLanguages()),
    laborHours: await estimateLaborHours(),
    permissions: { licenses: [{ name: "CC0-1.0", URL: "https://…" }], usageType: ["openSource"] },
    reuseFrequency: { forks: repo.data.forks_count },
    date: { created: repo.data.created_at, lastModified: repo.data.pushed_at },
  };

  // 3. Hand core the plain data — it merges, derives, validates, or throws.
  try {
    const result = assembleCodeJSON(observed, existing, {
      isArchived: repo.data.archived,
    });
    writeFileSync("code.json", JSON.stringify(result, null, 2) + "\n");
    console.log("code.json updated ✓");
  } catch (err) {
    if (err instanceof CodeJSONValidationError) {
      // Structured errors → annotate the PR / fail the check.
      err.errors.forEach((e) => console.error(`::error::${e}`));
      process.exit(1);
    }
    throw err;
  }
}
```
