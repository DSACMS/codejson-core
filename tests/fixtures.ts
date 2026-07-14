import { type CodeJSON } from "../src/schema/neutral.js";

// a fully-populated, schema-valid neutral code.json
export const validNeutral: CodeJSON = {
  name: "Example Project",
  version: "1.0.0",
  description: "An example project for testing.",
  status: "Development",
  permissions: {
    licenses: [{ name: "MIT", URL: "https://example.com/license" }],
    usageType: ["openSource"],
    exemptionText: "",
  },
  organization: "18F",
  repositoryURL: "https://github.com/example/repo",
  repositoryVisibility: "public",
  vcs: "git",
  laborHours: 100,
  reuseFrequency: { forks: 3, clones: 7 },
  languages: ["TypeScript", "Go"],
  maintenance: "internal",
  contractNumber: [],
  SBOM: "https://github.com/example/repo/network/dependencies",
  date: {
    created: "2020-01-01T00:00:00Z",
    lastModified: "2020-06-01T00:00:00Z",
    metadataLastUpdated: "2020-06-01T00:00:00Z",
  },
  tags: ["example"],
  contact: { email: "team@example.com", name: "Example Team" },
  feedbackMechanism: "https://github.com/example/repo/issues",
  AIUseCaseID: "0",
};

// deep clone so tests can mutate freely without cross-test bleed.
export const clone = <T>(value: T): T =>
  structuredClone(value) as T;
