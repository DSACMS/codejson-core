import { type CodeJSON } from "./schema/neutral.js";
import { baselineCodeJSON } from "./baselines/neutral.js";
import { neutralProfile } from "./profiles/neutral.js";
import {
  filterValidFields as filterValidFieldsWith,
  migrateLegacyFields,
} from "./normalize.js";

// ── neutral schema + types (generated, version-pinned) ────────────────────
export {
  CodeJSONSchema,
  type CodeJSON,
  SCHEMA_VERSION,
} from "./schema/neutral.js";

// ── neutral baseline ──────────────────────────────────────────────────────
export { baselineCodeJSON } from "./baselines/neutral.js";

// ── default API: neutral-bound validate / assemble ────────────────────────
export const validateCodeJSON = neutralProfile.validate;
export const isValidCodeJSON = neutralProfile.isValid;
export const assembleCodeJSON = neutralProfile.assemble;

// ── normalization (neutral-bound; baseline pre-injected) ──────────────────
export const filterValidFields = (
  input: Record<string, unknown>,
): Partial<CodeJSON> => filterValidFieldsWith(baselineCodeJSON, input);
export { migrateLegacyFields };

// ── CMS variant (shipped preset, aliased) ─────────────────────────────────
export {
  CodeJSONSchema as CMSCodeJSONSchema,
  type CodeJSON as CMSCodeJSON,
  SCHEMA_VERSION as CMS_SCHEMA_VERSION,
} from "./schema/cms.js";
export { cmsBaselineCodeJSON } from "./baselines/cms.js";

// ── profiles + factory (add an agency, zero core changes) ─────────────────
export { neutralProfile } from "./profiles/neutral.js";
export { cmsProfile } from "./profiles/cms.js";
export {
  createCodeJSONProfile,
  type CodeJSONProfile,
} from "./profile.js";

// ── errors ────────────────────────────────────────────────────────────────
export { CodeJSONValidationError } from "./errors.js";
