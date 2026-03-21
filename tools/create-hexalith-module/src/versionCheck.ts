import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const DEFAULT_HEXALITH_VERSION = "0.1.0";
export const DEFAULT_HEXALITH_VERSION_RANGE = `^${DEFAULT_HEXALITH_VERSION}`;

interface PackageVersions {
  shellApi: string;
  cqrsClient: string;
  ui: string;
}

function toVersionRange(version: string | undefined): string {
  if (!version) {
    return DEFAULT_HEXALITH_VERSION_RANGE;
  }

  if (/^[~^<>]=?|workspace:/.test(version)) {
    return version;
  }

  return `^${version}`;
}

export async function readWorkspaceVersions(
  monorepoRoot: string,
): Promise<PackageVersions> {
  const packages = [
    { key: "shellApi" as const, path: "packages/shell-api/package.json" },
    { key: "cqrsClient" as const, path: "packages/cqrs-client/package.json" },
    { key: "ui" as const, path: "packages/ui/package.json" },
  ];

  const results: Record<string, string> = {};

  for (const pkg of packages) {
    const pkgPath = join(monorepoRoot, pkg.path);
    const content = await readFile(pkgPath, "utf-8");
    const parsed = JSON.parse(content) as { version?: string };
    results[pkg.key] = toVersionRange(parsed.version);
  }

  return results as unknown as PackageVersions;
}
