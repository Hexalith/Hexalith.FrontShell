import { execFile } from "node:child_process";
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { promisify } from "node:util";

import { toPascalCase, toDisplayName } from "./nameUtils.js";
import { readWorkspaceVersions } from "./versionCheck.js";

const execFileAsync = promisify(execFile);

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".html",
  ".css",
  ".js",
  ".mjs",
]);

interface ScaffoldOptions {
  moduleName: string;
  outputDir: string;
  templateDir: string;
  monorepoRoot: string;
}

async function getAllFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function isTextFile(filePath: string): boolean {
  const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function replacePlaceholders(
  content: string,
  moduleName: string,
  displayName: string,
  packageName: string,
  pascalCase: string,
): string {
  let result = content;

  result = result.replaceAll("__MODULE_NAME__", moduleName);
  result = result.replaceAll("__MODULE_DISPLAY_NAME__", displayName);
  result = result.replaceAll("__MODULE_PACKAGE_NAME__", packageName);

  result = result.replace(/\bExample(?=[A-Z])/g, pascalCase);

  return result;
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

export async function scaffold(options: ScaffoldOptions): Promise<string[]> {
  const { moduleName, outputDir, templateDir, monorepoRoot } = options;

  const displayName = toDisplayName(moduleName);
  const packageName = `@hexalith/${moduleName}`;
  const pascalCase = toPascalCase(moduleName);

  let versions: { shellApi: string; cqrsClient: string; ui: string };
  try {
    versions = await readWorkspaceVersions(monorepoRoot);
  } catch {
    versions = {
      shellApi: "workspace:*",
      cqrsClient: "workspace:*",
      ui: "workspace:*",
    };
  }

  await mkdir(outputDir, { recursive: true });

  const templateFiles = await getAllFiles(templateDir);
  const createdFiles: string[] = [];

  for (const templateFile of templateFiles) {
    const relativePath = relative(templateDir, templateFile);
    // Apply Example→PascalCase renaming to file/directory names (same regex as content)
    const transformedPath = relativePath.replace(/Example(?=[A-Z])/g, pascalCase);
    const destPath = join(outputDir, transformedPath);

    await mkdir(dirname(destPath), { recursive: true });

    if (isTextFile(templateFile)) {
      let content = await readFile(templateFile, "utf-8");
      content = normalizeLineEndings(content);
      content = replacePlaceholders(
        content,
        moduleName,
        displayName,
        packageName,
        pascalCase,
      );

      content = content.replace(
        /"@hexalith\/shell-api":\s*"[^"]*"/,
        `"@hexalith/shell-api": "${versions.shellApi}"`,
      );
      content = content.replace(
        /"@hexalith\/cqrs-client":\s*"[^"]*"/,
        `"@hexalith/cqrs-client": "${versions.cqrsClient}"`,
      );
      content = content.replace(
        /"@hexalith\/ui":\s*"[^"]*"/,
        `"@hexalith/ui": "${versions.ui}"`,
      );

      await writeFile(destPath, content, "utf-8");
    } else {
      await copyFile(templateFile, destPath);
    }

    createdFiles.push(transformedPath);
  }

  try {
    await execFileAsync("git", ["init", "-b", "main"], { cwd: outputDir });
  } catch {
    console.warn(
      "Warning: git is not installed or failed to initialize. The module directory is still valid.",
    );
  }

  return createdFiles;
}

export async function checkDirectoryExists(dir: string): Promise<boolean> {
  try {
    const stats = await stat(dir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
