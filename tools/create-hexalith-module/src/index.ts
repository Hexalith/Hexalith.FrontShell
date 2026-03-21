import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkDirectoryExists, scaffold } from "./scaffold.js";
import { validateModuleName } from "./validateModuleName.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main(): Promise<void> {
  const moduleName = process.argv[2];

  const validationError = validateModuleName(moduleName ?? "");
  if (validationError) {
    console.error(`Error: ${validationError}`);
    process.exitCode = 1;
    return;
  }

  const outputDirName = `hexalith-${moduleName}`;
  const outputDir = resolve(process.cwd(), outputDirName);

  if (await checkDirectoryExists(outputDir)) {
    console.error(
      `Error: Directory '${outputDirName}' already exists.\n\nTo fix this, either:\n  - Remove the existing directory and rerun the command\n    PowerShell: Remove-Item -Recurse -Force ${outputDirName}\n    bash: rm -rf ${outputDirName}\n  - Choose a different module name`,
    );
    process.exitCode = 1;
    return;
  }

  // Resolve template directory relative to package root (not dist/)
  const packageRoot = resolve(__dirname, "..");
  const templateDir = join(packageRoot, "templates", "module");
  const monorepoRoot = resolve(packageRoot, "../..");

  const createdFiles = await scaffold({
    moduleName,
    outputDir,
    templateDir,
    monorepoRoot,
  });

  console.log(`\nCreated ${outputDirName}/ (${createdFiles.length} files)\n`);
  console.log("Next steps:");
  console.log(`  cd ${outputDirName}`);
  console.log("  pnpm install");
  console.log("  pnpm dev");
}

main().catch((error: unknown) => {
  console.error("Unexpected error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
