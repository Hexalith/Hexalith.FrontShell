import { readFile } from "node:fs/promises";
import { join } from "node:path";

interface PackageVersions {
  shellApi: string;
  cqrsClient: string;
  ui: string;
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
    results[pkg.key] = parsed.version ?? "workspace:*";
  }

  return results as unknown as PackageVersions;
}
