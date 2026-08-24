import { type CodeJSON } from "../schema/cms.js";

// enum-typed fields sit at "" rather than undefined so they dont get dropped.
const blankEnum = "" as never;

// CMS variant skeleton of code.json (gov-codejson CMS schema)
export const cmsBaselineCodeJSON: Partial<CodeJSON> = {
  name: "",
  version: "",
  description: "",
  longDescription: "",
  status: blankEnum,
  permissions: {
    // CMS repositories default to CC0; override in observed for anything else
    licenses: [{ name: "CC0-1.0", URL: "" }],
    usageType: [],
    exemptionText: "",
  },
  organization: "Centers for Medicare & Medicaid Services",
  repositoryURL: "",
  repositoryHost: blankEnum,
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
  platforms: [],
  categories: [],
  softwareType: blankEnum,
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
  localisation: false,
  repositoryType: blankEnum,
  userInput: false,
  fismaLevel: blankEnum,
  group: "",
  projects: [],
  systems: [],
  subsetInHealthcare: [],
  userType: [],
  maturityModelTier: 0,
};
