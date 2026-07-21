# `src/` — How codejson-core works

This directory is the whole library. `codejson-core` owns three things about [code.json](https://code.gov) and nothing else:

1. **Schema + types** — a version-pinned Zod schema and the `CodeJSON` type inferred from it.
2. **Validation** — turn any unknown value into a list of human-readable errors (or a type guard).
3. **Assembly** — merge freshly-observed fields with an existing file into one complete, validated `CodeJSON` — or throw.

Everything here is **pure**: no network, no filesystem, no GitHub, no `child_process`. The only runtime dependencies are `zod` and `zod-validation-error`. If a module in here reaches out to the outside world, the design is wrong — that work belongs to the *caller* (e.g. the GitHub Action or a CLI).

---

## The pieces

| File | What it owns |
|---|---|
| `schema/neutral.ts`, `schema/cms.ts` | **Generated + committed.** Each exports a Zod `CodeJSONSchema`, the inferred `CodeJSON` type, and a pinned `SCHEMA_VERSION`. Do not hand-edit — regenerate with `bun run generate-schema`. `neutral` tracks the base `gov-codejson` schema; `cms` tracks the CMS variant (extra fields like `fismaLevel`, `maturityModelTier`). |
| `baselines/neutral.ts`, `baselines/cms.ts` | A `Partial<CodeJSON>` **skeleton** — every field present at its empty/default value (`""`, `[]`, `undefined`, `0`). The neutral baseline carries **zero** agency content (no organization, no default license). The baseline's key set also doubles as the whitelist for `filterValidFields`. |
| `validation.ts` | `validateWith(schema, input)` → `string[]` (`[]` means valid) and `isValidWith(schema, input)` → type guard. Schema-generic: profiles bind them to a specific variant. |
| `normalize.ts` | `filterValidFields(baseline, input)` drops any key not in the baseline (removes stale/unknown fields). `migrateLegacyFields(input)` reshapes legacy data so it still validates (currently: `contractNumber` string → array). Both are pure and immutable. |
| `assemble.ts` | `assembleWith(schema, baseline, observed, existing, options)` — the heart of the library. Merges everything with precedence, computes derived fields, validates, and returns or throws. |
| `errors.ts` | `CodeJSONValidationError` — carries a structured `.errors: string[]` plus a readable `.message`, so callers can render or hard-fail as they choose. |
| `profile.ts` | `createCodeJSONProfile(schema, baseline, version)` bundles a variant's schema + baseline + version into one `CodeJSONProfile` object with `.validate` / `.isValid` / `.assemble` pre-bound. This is how a new agency is added with **zero core changes**. |
| `profiles/neutral.ts`, `profiles/cms.ts` | Pre-built profiles for the shipped variants. |
| `index.ts` | The **public barrel**. Re-exports the neutral schema/baseline, a neutral-bound default API (`validateCodeJSON`, `isValidCodeJSON`, `assembleCodeJSON`, `filterValidFields`), the CMS variant (aliased), both profiles, the `createCodeJSONProfile` factory, and `CodeJSONValidationError`. |

---

## How it fits together

The generic helpers in `validation.ts` and `assemble.ts` don't know about any particular schema. A **profile** ties them to one variant:

```
schema/neutral.ts ─┐
                   ├─► profile.ts (createCodeJSONProfile) ─► profiles/neutral.ts ─► index.ts default API
baselines/neutral ─┘                                                                (validateCodeJSON, assembleCodeJSON, …)
```

`index.ts` exposes the **neutral** profile as the default top-level API, so the common case needs no profile wiring. The **CMS** profile (and the `createCodeJSONProfile` factory for your own agency) are exported alongside it.

Adding an agency: generate a `schema/<agency>.ts`, write a `baselines/<agency>.ts`, and call `createCodeJSONProfile(schema, baseline, SCHEMA_VERSION)`. No changes to `assemble.ts`, `validation.ts`, or `normalize.ts`.

---

## The assembly flow (the important part)

`assembleWith` (exposed as `assembleCodeJSON` on a profile) is where observed data and prior state become one valid file. It runs in four steps:

**Step 1 — Prepare the existing file.** If there's a current `code.json`, run it through `filterValidFields` (drop keys not in the baseline) then `migrateLegacyFields` (fix legacy shapes). If there's no existing file, this is `{}`.

**Step 2 — Compute derived fields.** Some fields aren't a simple override; they have selection logic. With `repoURL = observed.repositoryURL ?? existing.repositoryURL ?? ""`:

| Field | Rule |
|---|---|
| `feedbackMechanism` | keep existing if truthy, else `` `${repoURL}/issues` `` |
| `SBOM` | keep existing if truthy, else `` `${repoURL}/network/dependencies` `` |
| `description` | observed if non-empty (trimmed), else existing, else `""` |
| `tags` | observed if non-empty, else existing; if `isArchived` and `"archived"` absent, append it once |
| `status` | set to `"Archival"` only when `isArchived` |
| `reuseFrequency` | `forks` from observed → existing → 0; `clones` preserved from existing (callers usually can't observe clones) |
| `date` | `created`/`lastModified` from observed → existing → `""`; `metadataLastUpdated` = `now()` (injectable clock) as ISO string |

**Step 3 — Merge with precedence (later wins):**

```
{ ...baseline,          // 1. neutral floor — every field present
  ...cleanedExisting,   // 2. current committed values (filtered + migrated)
  ...observed,          // 3. freshly-acquired fields
  ...derived }          // 4. computed fields — authoritative, applied last
```

**Step 4 — Validate.** Run the result through the schema. If there are any errors, **throw** `CodeJSONValidationError` (with the structured list). Otherwise return the complete `CodeJSON`.

> **Expected throw:** if no repository URL is available anywhere, `feedbackMechanism`/`SBOM` become `/issues` and `/network/dependencies`, which fail URL validation → it throws. That's intended: a valid code.json can't exist without a repository URL. Supplying `observed.repositoryURL` is the caller's job.

---

## Examples

See [`EXAMPLES.md`](./EXAMPLES.md) for copy-pasteable recipes: assembling a file, first-time generation, standalone validation, type-guarding unknown data, archived repos, deterministic tests, the CMS variant, adding your own agency, and a full GitHub Action walkthrough.

---

## Regenerating the schema

The schema files are **committed artifacts** — the pin. When `gov-codejson` publishes a new schema version:

```bash
bun run generate-schema
```

This rewrites `schema/*.ts` (including the bumped `SCHEMA_VERSION`). Commit the result and cut a release; downstream consumers adopt the new schema by bumping their `codejson-core` dependency. There is no runtime fetch — the committed file *is* the version pin.
