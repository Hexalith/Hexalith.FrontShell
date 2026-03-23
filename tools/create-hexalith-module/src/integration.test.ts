import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { toPascalCase } from "./nameUtils.js";
import { scaffold } from "./scaffold.js";
import { readWorkspaceVersions } from "./versionCheck.js";

const execFileAsync = promisify(execFile);

const PACKAGE_ROOT = resolve(import.meta.dirname, "..");
const MONOREPO_ROOT = resolve(PACKAGE_ROOT, "../..");
const TEMPLATE_DIR = join(PACKAGE_ROOT, "templates", "module");

async function getAllFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath ?? e.path, e.name).replace(dir + "\\", "").replace(dir + "/", ""));
}

describe("integration: scaffold smoke test", () => {
  let tempDir: string;
  let outputDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `scaffold-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    outputDir = join(tempDir, "hexalith-my-orders");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("generates all template files dynamically compared to template source", async () => {
    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir: TEMPLATE_DIR,
      monorepoRoot: MONOREPO_ROOT,
    });

    const templateFiles = await getAllFiles(TEMPLATE_DIR);
    const outputFiles = await getAllFiles(outputDir);

    // Filter out .git directory from output
    const outputFilesFiltered = outputFiles.filter(
      (f) => !f.startsWith(".git/") && !f.startsWith(".git\\"),
    );

    // Every template file should appear in output (with Example→PascalCase renaming)
    const pascalCase = toPascalCase("my-orders");
    for (const templateFile of templateFiles) {
      const normalized = templateFile.replace(/\\/g, "/");
      const expected = normalized.replace(/Example(?=[A-Z])/g, pascalCase);
      const found = outputFilesFiltered.some(
        (f) => f.replace(/\\/g, "/") === expected,
      );
      expect(found, `Expected output to contain ${expected}`).toBe(true);
    }
  });

  it("generates package.json with correct dependencies", async () => {
    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir: TEMPLATE_DIR,
      monorepoRoot: MONOREPO_ROOT,
    });

    const pkgContent = await readFile(join(outputDir, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgContent);
    const expectedVersions = await readWorkspaceVersions(MONOREPO_ROOT);

    expect(pkg.name).toBe("@hexalith/my-orders");
    expect(pkg.type).toBe("module");
    expect(pkg.peerDependencies["@hexalith/shell-api"]).toBe(expectedVersions.shellApi);
    expect(pkg.peerDependencies["@hexalith/cqrs-client"]).toBe(expectedVersions.cqrsClient);
    expect(pkg.peerDependencies["@hexalith/ui"]).toBe(expectedVersions.ui);
    expect(pkg.peerDependencies).toHaveProperty("react");
    expect(pkg.peerDependencies).toHaveProperty("react-dom");
    expect(pkg.peerDependencies).toHaveProperty("zod");
    expect(pkg.repository?.type).toBe("git");
    expect(pkg.repository?.url).toBe("https://github.com/your-org/hexalith-my-orders.git");
  });

  it("generates tsconfig.json that extends base", async () => {
    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir: TEMPLATE_DIR,
      monorepoRoot: MONOREPO_ROOT,
    });

    const tsconfigContent = await readFile(join(outputDir, "tsconfig.json"), "utf-8");
    const tsconfig = JSON.parse(tsconfigContent);

    expect(tsconfig.extends).toBe("@hexalith/tsconfig/base.json");
    expect(tsconfig.compilerOptions.jsx).toBe("react-jsx");
  });

  it("applies module name substitution correctly", async () => {
    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir: TEMPLATE_DIR,
      monorepoRoot: MONOREPO_ROOT,
    });

    const manifestContent = await readFile(join(outputDir, "src", "manifest.ts"), "utf-8");
    expect(manifestContent).toContain('"my-orders"');
    expect(manifestContent).toContain('"My Orders"');
    expect(manifestContent).not.toContain("__MODULE_NAME__");
    expect(manifestContent).not.toContain("__MODULE_DISPLAY_NAME__");

    const routesContent = await readFile(join(outputDir, "src", "routes.tsx"), "utf-8");
    expect(routesContent).toContain("MyOrdersRootPage");
    expect(routesContent).not.toContain("ExampleRootPage");

    const indexContent = await readFile(join(outputDir, "src", "index.ts"), "utf-8");
    expect(indexContent).toContain("export { MyOrdersRootPage as default }");
  });

  it("includes ESLint config", async () => {
    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir: TEMPLATE_DIR,
      monorepoRoot: MONOREPO_ROOT,
    });

    expect(existsSync(join(outputDir, "eslint.config.js"))).toBe(true);
    const eslintContent = await readFile(join(outputDir, "eslint.config.js"), "utf-8");
    expect(eslintContent).toContain("module-isolation");
  });

  it("includes .gitignore and .gitattributes", async () => {
    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir: TEMPLATE_DIR,
      monorepoRoot: MONOREPO_ROOT,
    });

    expect(existsSync(join(outputDir, ".gitignore"))).toBe(true);
    expect(existsSync(join(outputDir, ".gitattributes"))).toBe(true);

    const gitattributes = await readFile(join(outputDir, ".gitattributes"), "utf-8");
    expect(gitattributes).toContain("text=auto eol=lf");
  });

  it("includes a standalone stylelint config", async () => {
    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir: TEMPLATE_DIR,
      monorepoRoot: MONOREPO_ROOT,
    });

    const stylelintContent = await readFile(join(outputDir, ".stylelintrc.json"), "utf-8");
    expect(stylelintContent).toContain("@hexalith/ui/dist/tokenCompliance.js");
    expect(stylelintContent).not.toContain("../../.stylelintrc.json");
  });

  it("initializes git repository", async () => {
    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir: TEMPLATE_DIR,
      monorepoRoot: MONOREPO_ROOT,
    });

    expect(existsSync(join(outputDir, ".git"))).toBe(true);
  });

  it("has no unreplaced placeholder tokens in output", async () => {
    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir: TEMPLATE_DIR,
      monorepoRoot: MONOREPO_ROOT,
    });

    const files = await getAllFiles(outputDir);
    const textFiles = files.filter((f) => {
      const ext = f.substring(f.lastIndexOf(".")).toLowerCase();
      return [".ts", ".tsx", ".json", ".md", ".html", ".css", ".js"].includes(ext);
    });

    for (const file of textFiles) {
      const content = await readFile(join(outputDir, file), "utf-8");
      const matches = content.match(/__[A-Z_]+__/g);
      expect(
        matches,
        `Found unreplaced placeholder(s) in ${file}: ${matches?.join(", ")}`,
      ).toBeNull();
    }
  });

  it("type-checks the scaffolded source against workspace types", async () => {
    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir: TEMPLATE_DIR,
      monorepoRoot: MONOREPO_ROOT,
    });

    // Create a temporary tsconfig for type-checking the output.
    // Inline base config settings because the temp dir has no node_modules.
    const tsconfigContent = JSON.stringify({
      compilerOptions: {
        strict: true,
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "react-jsx",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        noEmit: true,
        types: ["node"],
        typeRoots: [join(PACKAGE_ROOT, "node_modules/@types")],
        paths: {
          "@hexalith/shell-api": [join(MONOREPO_ROOT, "packages/shell-api/src/index.ts")],
          "@hexalith/cqrs-client": [join(MONOREPO_ROOT, "packages/cqrs-client/src/index.ts")],
          "@hexalith/ui": [join(MONOREPO_ROOT, "packages/ui/src/index.ts")],
          "@hexalith/ui/tokens.css": [join(MONOREPO_ROOT, "packages/ui/src/tokens/index.css")],
          "@vitejs/plugin-react": [
            join(
              MONOREPO_ROOT,
              "node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@6.4.1_@types+node@25.5.0_/node_modules/@vitejs/plugin-react/dist/index.d.ts",
            ),
          ],
          vite: [
            join(
              MONOREPO_ROOT,
              "node_modules/.pnpm/vite@6.4.1_@types+node@25.5.0/node_modules/vite/dist/node/index.d.ts",
            ),
          ],
          "react-router": [join(MONOREPO_ROOT, "apps/shell/node_modules/react-router/dist/development/index.d.ts")],
          "zod": [join(MONOREPO_ROOT, "node_modules/.pnpm/zod@3.25.76/node_modules/zod/index.d.cts")],
          "vitest": [join(MONOREPO_ROOT, "node_modules/vitest/dist/index.d.ts")],
          "@testing-library/react": [join(MONOREPO_ROOT, "node_modules/.pnpm/node_modules/@testing-library/react/types/index.d.ts")],
          "@testing-library/jest-dom/vitest": [join(MONOREPO_ROOT, "node_modules/.pnpm/node_modules/@testing-library/jest-dom/vitest.d.ts")],
          "@testing-library/user-event": [join(MONOREPO_ROOT, "node_modules/.pnpm/node_modules/@testing-library/user-event/dist/types/index.d.ts")],
          "@playwright/experimental-ct-react": [join(MONOREPO_ROOT, "node_modules/.pnpm/node_modules/@playwright/experimental-ct-react/index.d.ts")],
          "@playwright/experimental-ct-react/hooks": [join(MONOREPO_ROOT, "node_modules/.pnpm/node_modules/@playwright/experimental-ct-react/hooks.d.ts")],
          "@axe-core/playwright": [join(MONOREPO_ROOT, "node_modules/.pnpm/node_modules/@axe-core/playwright/dist/index.d.ts")],
        },
      },
      include: [
        "src/**/*.ts",
        "src/**/*.tsx",
        "playwright/**/*.ts",
        "playwright/**/*.tsx",
        "playwright-ct.config.ts",
        "dev-host/**/*.ts",
        "dev-host/**/*.tsx",
      ],
    });

    const { writeFile: writeFs } = await import("node:fs/promises");
    await writeFs(join(outputDir, "tsconfig.check.json"), tsconfigContent);

    // Run tsc --noEmit to verify types using the monorepo's typescript
    const tscLib = join(MONOREPO_ROOT, "node_modules", "typescript", "lib", "tsc.js");
    try {
      await execFileAsync(
        process.execPath,
        [tscLib, "-p", "tsconfig.check.json", "--noEmit"],
        { cwd: outputDir },
      );
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string };
      const output = [execError.stdout, execError.stderr].filter(Boolean).join("\n");
      expect.unreachable(`tsc type-check failed:\n${output}`);
    }
  }, 30000);
});
