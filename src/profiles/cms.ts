import {
  CodeJSONSchema,
  SCHEMA_VERSION,
  type CodeJSON,
} from "../schema/cms.js";
import { cmsBaselineCodeJSON } from "../baselines/cms.js";
import { createCodeJSONProfile } from "../profile.js";

export const cmsProfile = createCodeJSONProfile<CodeJSON>(
  CodeJSONSchema,
  cmsBaselineCodeJSON,
  SCHEMA_VERSION,
);
