import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import postcss from "postcss";
import stylelint from "stylelint";

import { computeComplianceScore } from "../packages/ui/dist/index.js";

const rootDir = process.cwd();
const includedExtension = ".css";
const ignoredPathSegments = new Set(["node_modules", "dist", ".turbo"]);
const ignoredRelativeStarts = [
  "_bmad/",
  "_bmad-output/",
  "Hexalith.Tenants/",
  "packages/ui/src/tokens/",
];

function normalizeRelative(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

function writeLine(message) {
  process.stdout.write(`${message}\n`);
}

function shouldIgnore(filePath) {
  const relativePath = normalizeRelative(filePath);

  if (!relativePath.endsWith(includedExtension)) {
    return true;
  }

  if (relativePath.startsWith(".git/")) {
    return true;
  }

  if (ignoredRelativeStarts.some((prefix) => relativePath.startsWith(prefix))) {
    return true;
  }

  return relativePath
    .split("/")
    .some((segment) => ignoredPathSegments.has(segment));
}

async function collectCssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const relativePath = normalizeRelative(fullPath);

    if (entry.isDirectory()) {
      if (
        entry.name === ".git" ||
        ignoredRelativeStarts.some((prefix) => relativePath.startsWith(prefix))
      ) {
        continue;
      }

      if (ignoredPathSegments.has(entry.name)) {
        continue;
      }

      files.push(...(await collectCssFiles(fullPath)));
      continue;
    }

    if (!shouldIgnore(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function countDeclarations(filePath) {
  const source = await readFile(filePath, "utf8");
  const root = postcss.parse(source, { from: filePath });
  let declarations = 0;

  root.walkDecls(() => {
    declarations += 1;
  });

  return declarations;
}

async function main() {
  const cssFiles = await collectCssFiles(rootDir);

  if (cssFiles.length === 0) {
    writeLine("Hexalith Design System Health: 100% (no CSS files to scan)");
    return;
  }

  const existingFiles = [];
  for (const filePath of cssFiles) {
    if ((await stat(filePath)).isFile()) {
      existingFiles.push(filePath);
    }
  }

  const lintResult = await stylelint.lint({
    files: existingFiles,
    configFile: path.join(rootDir, ".stylelintrc.json"),
    formatter: "string",
    allowEmptyInput: true,
  });

  if (lintResult.report.trim()) {
    writeLine(lintResult.report.trim());
  }

  let declarationCount = 0;
  for (const filePath of existingFiles) {
    declarationCount += await countDeclarations(filePath);
  }

  const warningCount = lintResult.results.reduce(
    (total, result) => total + result.warnings.length,
    0,
  );
  const score = computeComplianceScore(declarationCount, warningCount);

  writeLine(
    `Hexalith Design System Health: ${score}% (${declarationCount - warningCount}/${declarationCount} declarations compliant)`,
  );

  if (lintResult.errored) {
    process.exitCode = 2;
  }
}

await main();
