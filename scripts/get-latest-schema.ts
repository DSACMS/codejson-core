const CONTENTS_BASE = "https://api.github.com/repos/DSACMS/gov-codejson/contents";

// pick the highest schema-x.y.z.json version in a gov-codejson schemas dir
export async function getLatestSchemaVersion(
  dir = "schemas/cms",
): Promise<string> {
  const response = await fetch(`${CONTENTS_BASE}/${dir}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...(process.env.GITHUB_TOKEN && {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      }),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch schema list for ${dir}: ${response.status}`);
  }

  const files = (await response.json()) as Array<{ name: string }>;

  // regex ignores sibling dirs (cms/, agency-index/), so listing "schemas" get neutral versions
  const versions = files
    .map((f) => f.name.match(/^schema-(\d+\.\d+\.\d+)\.json$/)?.[1])
    .filter(Boolean) as string[];

  if (versions.length === 0) {
    throw new Error(`No schema versions found in ${dir}`);
  }

  const versionNumber = versions.sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true }),
  )[0];

  return versionNumber;
}
