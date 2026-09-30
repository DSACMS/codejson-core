import { neutralProfile } from "./neutral.js";
import { cmsProfile } from "./cms.js";

export const profiles = { neutral: neutralProfile, cms: cmsProfile } as const;
export type ProfileName = keyof typeof profiles;
