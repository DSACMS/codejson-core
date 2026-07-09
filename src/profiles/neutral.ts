import {
  CodeJSONSchema,
  SCHEMA_VERSION,
  type CodeJSON,
} from "../schema/neutral.js";
import { baselineCodeJSON } from "../baselines/neutral.js";
import { createCodeJSONProfile } from "../profile.js";

export const neutralProfile = createCodeJSONProfile<CodeJSON>(
  CodeJSONSchema,
  baselineCodeJSON,
  SCHEMA_VERSION,
);
