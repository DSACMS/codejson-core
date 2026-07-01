import fs from "fs";
import path from "path";
import prettier from "prettier";
import { type JsonSchema, jsonSchemaToZod } from "json-schema-to-zod";
import { getLatestSchemaVersion } from "./get-latest-schema.js";

const SCHEMA_BASE_URL = "https://raw.githubusercontent.com/DSACMS/gov-codejson/refs/heads/main/schemas/cms";
const filePath = "src/schema/CodeJSONSchema.ts";

// widen .url() to allow "" too, since code.json uses empty strings for N/A urls
function allowEmptyUrls(zodCode: string): string {
  return zodCode.replace(/\.url\(\)/g, '.url().or(z.literal(""))');
}

// uniqueItems is handled natively by json-schema-to-zod now, so no transform needed for it
// rules that json-schema-to-zod can't do like exemption in usageType => exemptionText required
function addAdditionalRefinements(): string {
  return `
        .refine(
            (data) => {
                const usageTypes = data.permissions?.usageType ?? [];
                const hasExemption = usageTypes.some(
                (type) => typeof type === "string" && type.startsWith("exemptBy")
                );

                if (hasExemption) {
                return (
                    data.permissions?.exemptionText != null &&
                    data.permissions.exemptionText.trim().length > 0
                );
                }

                return true;
            },
            {
                message: "exemptionText is required when usageType contains an exemption",
                path: ["permissions", "exemptionText"],
            }
        );
    `;
}

async function formatFile(filePath: string) {
  const absolutePath = path.resolve(filePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const config = await prettier.resolveConfig(absolutePath);

  const formatted = await prettier.format(source, {
    ...config,
    filepath: absolutePath,
  });

  fs.writeFileSync(absolutePath, formatted);
}

async function generateSchema() {
  const schemaVersion = await getLatestSchemaVersion();
  console.log(`Latest schema version: ${schemaVersion}`);

  const schemaURL = `${SCHEMA_BASE_URL}/schema-${schemaVersion}.json`;
  console.log(`Fetching JSON schema from GitHub...`);
  const response = await fetch(schemaURL);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch schema: ${response.status} ${response.statusText}`,
    );
  }

  const jsonSchema = (await response.json()) as JsonSchema;

  console.log(`Converting JSON schema to Zod...`);
  let zodSourceCode = jsonSchemaToZod(jsonSchema);

  zodSourceCode = allowEmptyUrls(zodSourceCode);

  const fileContent = `
        // DO NOT EDIT - AUTOMATICALLY GENERATED FILE!!!
        // Schema Version: ${schemaVersion}

        import { z } from "zod";

        export const SCHEMA_VERSION = "${schemaVersion}";

        export const CodeJSONSchema = (${zodSourceCode})${addAdditionalRefinements()}

        export type CodeJSON = z.infer<typeof CodeJSONSchema>;
    `;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, fileContent);
  console.log(`File written to ${filePath}...`);

  await formatFile(filePath);
  console.log(`Schema generation complete!`);
}

try {
  await generateSchema();
} catch (error) {
  console.error(`Schema generation failed!`);

  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error(`Unknown error:`, error);
  }
  process.exit(1);
}
