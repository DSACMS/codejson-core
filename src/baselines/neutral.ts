import { type CodeJSON } from "../schema/neutral.js";

// enum-typed fields sit at "" rather than undefined so they dont get dropped.
const blankEnum = "" as never;

// neutral, agency agnostic skeleton of code.json (gov-codejson base schema)
export const baselineCodeJSON: Partial<CodeJSON> = {
  name: "",
  version: "",
  description: "",
  status: blankEnum,
  permissions: {
    licenses: [],
    usageType: [],
    exemptionText: "",
  },
  organization: "",
  repositoryURL: "",
  repositoryVisibility: blankEnum,
  homepageURL: "",
  downloadURL: "",
  disclaimerURL: "",
  disclaimerText: "",
  vcs: "git",
  laborHours: 0,
  reuseFrequency: {
    forks: 0,
    clones: 0,
  },
  languages: [],
  maintenance: blankEnum,
  contractNumber: [],
  SBOM: "",
  relatedCode: [],
  reusedCode: [],
  partners: [],
  date: {
    created: "",
    lastModified: "",
    metadataLastUpdated: "",
  },
  tags: [],
  contact: {
    email: "",
    name: "",
  },
  feedbackMechanism: "",
  AIUseCaseID: "0",
};
