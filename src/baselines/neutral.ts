import { type CodeJSON } from "../schema/neutral.js";

// neutral, agency agnostic skeleton of code.json (gov-codejson base schema)
export const baselineCodeJSON: Partial<CodeJSON> = {
  name: "",
  version: "",
  description: "",
  status: undefined,
  permissions: {
    licenses: [],
    usageType: [],
    exemptionText: "",
  },
  organization: "",
  repositoryURL: "",
  repositoryVisibility: undefined,
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
  maintenance: undefined,
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
