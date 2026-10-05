# `src/` — How codejson-core works

This directory is the whole library. `codejson-core` owns three things about [code.json](https://code.gov) and nothing else:

1. **Schema + types** — a version-pinned Zod schema and the `CodeJSON` type inferred from it.
2. **Validation** — turn any unknown value into a list of human-readable errors (or a type guard).
3. **Assembly** — merge freshly-observed fields with an existing file into one `CodeJSON`, either enforcing that the result is complete (`assemble`) or not (`draft`).

Everything here is **pure**: no network, no filesystem, no GitHub, no `child_process`. The only runtime dependencies are `zod` and `zod-validation-error`. If a module in here reaches out to the outside world, the design is wrong — that work belongs to the *caller* (e.g. the GitHub Action or a CLI).

---

## The pieces

| File | What it owns |
|---|---|
| `schema/neutral.ts`, `schema/cms.ts` | **Generated + committed.** Each exports a Zod `CodeJSONSchema`, the inferred `CodeJSON` type, and a pinned `SCHEMA_VERSION`. Do not hand-edit — regenerate with `bun run generate-schema`. `neutral` tracks the base `gov-codejson` schema; `cms` tracks the CMS variant (extra fields like `fismaLevel`, `maturityModelTier`). |
| `baselines/neutral.ts`, `baselines/cms.ts` | A `Partial<CodeJSON>` **skeleton** — every field present at its empty/default value (`""`, `[]`, `0`). **No field is `undefined`**, enums included: a baseline is meant to be written out and filled in, and `JSON.stringify` drops undefined-valued keys. `""` fails enum validation exactly as a missing key does, so this costs `assemble` nothing. The neutral baseline carries **zero** agency content (no organization, no default license); the CMS one carries the CMS organization and the CC0 license default. The baseline's key set also doubles as the whitelist for `filterValidFields`. |
| `validation.ts` | `validateWith(schema, input)` → `string[]` (`[]` means valid) and `isValidWith(schema, input)` → type guard. Schema-generic: profiles bind them to a specific variant. |
| `normalize.ts` | `filterValidFields(baseline, input)` drops any key not in the baseline (removes stale/unknown fields). `droppedFields(baseline, input)` reports the same keys instead of dropping them, for callers that need to tell someone what was thrown away. `migrateLegacyFields(input)` reshapes legacy data so it still validates (currently: `contractNumber` string → array). All pure and immutable. |
| `assemble.ts` | The heart of the library, in two layers. `mergeWith(baseline, observed, existing, options)` deep-merges field by field under per-field rules, then fills in computed fields — pure, **never throws**, may return an incomplete draft. `assembleWith(schema, baseline, …)` is `mergeWith` plus a validation gate that throws `CodeJSONValidationError`. |
| `errors.ts` | `CodeJSONValidationError` — carries a structured `.errors: string[]` plus a readable `.message`, so callers can render or hard-fail as they choose. |
| `profile.ts` | `createCodeJSONProfile(schema, baseline, version)` bundles a variant's schema + baseline + version into one `CodeJSONProfile` object with `.validate` / `.isValid` / `.assemble` / `.draft` / `.droppedFields` pre-bound. This is how a new agency is added with **zero core changes**. |
| `profiles/neutral.ts`, `profiles/cms.ts` | Pre-built profiles for the shipped variants. |
| `profiles/index.ts` | The `profiles` registry (`{ neutral, cms }`) and its `ProfileName` key type, so callers can pick a profile by name. |
| `index.ts` | The **public barrel**. Re-exports the neutral schema/baseline, a neutral-bound default API (`validateCodeJSON`, `isValidCodeJSON`, `assembleCodeJSON`, `draftCodeJSON`, `filterValidFields`, `droppedFields`), the CMS variant (aliased), both profiles, the `profiles` registry and `ProfileName`, the `createCodeJSONProfile` factory, `AssembleOptions`, and `CodeJSONValidationError`. |

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

`assembleWith` (exposed as `assembleCodeJSON` / `profile.assemble`) is where observed data and prior state become one valid file. It runs in four steps — the first three are `mergeWith`, the fourth is the gate that separates the two entry points:

**Step 1 — Clean the inputs.** If there's a current `code.json`, run it through `filterValidFields` (drop keys not in the baseline) then `migrateLegacyFields` (fix legacy shapes). If there's no existing file, this is `{}`. `observed` also goes through `filterValidFields`, so keys the profile doesn't define (e.g. `repositoryHost` on neutral) are dropped silently rather than reported.

**Step 2 — Deep-merge baseline, existing and observed.** Wherever any of the three is a plain object, the merge recurses into it over the union of their keys (baseline keys first, then existing, then observed, so key order is stable). Nested objects are never replaced wholesale, so a manual `permissions.licenses` survives an observed `permissions.usageType`. At each leaf the field's dotted path picks a rule:

| Field path | Rule | Result |
|---|---|---|
| `repositoryURL`, `repositoryVisibility`, `laborHours`, `reuseFrequency.forks`, `date.created`, `date.lastModified` | **observed** | observed if set, else existing, else baseline |
| `tags`, `reusedCode` | **union** | existing items in order, then each observed item not already present |
| everything else, including `name` and `description` | **existing** | existing if set, else observed, else baseline |

A value is **unset** when it's `undefined`, `null`, or deep-equal to the baseline value at that path. So a field left at its baseline default (`""`, `[]`, `maturityModelTier: 0`) is treated as blank and detection can fill it. Arrays are leaves: outside `tags`/`reusedCode`, an existing `languages` list wins whole, it isn't unioned.

For **union**, strings match on exact equality. Objects match when their `URL` or their `name` is equal, ignoring case and empty values, so a manual `reusedCode` entry isn't duplicated by a detected one. Union keeps no record of removals: delete a detected tag or dependency by hand and the next run adds it back.

**Step 3 — Fill in computed fields** on the merged result, with `repoURL = result.repositoryURL ?? ""`:

| Field | Rule |
|---|---|
| `feedbackMechanism` | if empty, `` `${repoURL}/issues` `` |
| `SBOM` | if empty, `` `${repoURL}/network/dependencies` `` |
| `date.metadataLastUpdated` | always `now()` (injectable clock) as ISO string |
| `status`, `tags` | only when `isArchived`: `status` becomes `"Archival"` and `"archived"` is appended to `tags` once |

Re-running the merge on its own output with the same observations gives the same document, apart from `metadataLastUpdated`.

**Step 4 — Validate.** Run the result through the schema. If there are any errors, **throw** `CodeJSONValidationError` (with the structured list). Otherwise return the complete `CodeJSON`.

> **Expected throw:** if no repository URL is available anywhere, `feedbackMechanism`/`SBOM` become `/issues` and `/network/dependencies`, which fail URL validation → it throws. That's intended: a valid code.json can't exist without a repository URL. Supplying `observed.repositoryURL` is the caller's job.

### `assemble` vs. `draft`

Both run steps 1–3. They differ only in step 4:

| | `assemble` / `assembleCodeJSON` / `assembleWith` | `draft` / `draftCodeJSON` / `mergeWith` |
|---|---|---|
| Step 4 | validates; **throws** `CodeJSONValidationError` if incomplete | skipped — **never throws** |
| Returns | a finished, schema-valid `CodeJSON` | whatever the merge produced, complete or not |
| Use when | the output has to be a valid file (a CI gate, a finalizer) | the output is deliberately a work in progress |

The second case is a generator: it can only observe some fields, so the rest come back at their baseline values (`""`, `[]`, `0`) for a human to fill in. That's a legitimate output, not a failure — so merging can't be welded to enforcing. Callers that produce a draft and *also* want to know what's still missing run `validate` on it separately and report the errors instead of throwing.

Since a draft is written to disk for someone to finish, **every baseline key must survive `JSON.stringify`** — which is why no baseline value is `undefined`. See the baselines row in the table above.

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
