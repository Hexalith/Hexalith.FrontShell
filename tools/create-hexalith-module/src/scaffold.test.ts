import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { scaffold, checkDirectoryExists } from "./scaffold.js";

describe("scaffold", () => {
  let tempDir: string;
  let templateDir: string;
  let outputDir: string;
  let monorepoRoot: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `scaffold-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    templateDir = join(tempDir, "templates", "module");
    outputDir = join(tempDir, "output", "hexalith-my-orders");
    monorepoRoot = join(tempDir, "monorepo");

    await mkdir(templateDir, { recursive: true });
    await mkdir(join(monorepoRoot, "packages", "shell-api"), { recursive: true });
    await mkdir(join(monorepoRoot, "packages", "cqrs-client"), { recursive: true });
    await mkdir(join(monorepoRoot, "packages", "ui"), { recursive: true });

    await writeFile(
      join(monorepoRoot, "packages", "shell-api", "package.json"),
      JSON.stringify({ name: "@hexalith/shell-api", version: "workspace:*" }),
    );
    await writeFile(
      join(monorepoRoot, "packages", "cqrs-client", "package.json"),
      JSON.stringify({ name: "@hexalith/cqrs-client", version: "workspace:*" }),
    );
    await writeFile(
      join(monorepoRoot, "packages", "ui", "package.json"),
      JSON.stringify({ name: "@hexalith/ui", version: "workspace:*" }),
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates output directory and copies template files", async () => {
    await mkdir(join(templateDir, "src"), { recursive: true });
    await writeFile(join(templateDir, "package.json"), '{"name": "__MODULE_PACKAGE_NAME__"}');
    await writeFile(join(templateDir, "src", "index.ts"), 'export const name = "__MODULE_NAME__";');

    const files = await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir,
      monorepoRoot,
    });

    expect(files).toContain("package.json");
    expect(files).toContain(join("src", "index.ts"));
    expect(existsSync(join(outputDir, "package.json"))).toBe(true);
    expect(existsSync(join(outputDir, "src", "index.ts"))).toBe(true);
  });

  it("replaces __MODULE_NAME__ placeholder", async () => {
    await writeFile(
      join(templateDir, "test.ts"),
      'const name = "__MODULE_NAME__";',
    );

    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir,
      monorepoRoot,
    });

    const content = await readFile(join(outputDir, "test.ts"), "utf-8");
    expect(content).toBe('const name = "my-orders";');
  });

  it("replaces __MODULE_DISPLAY_NAME__ placeholder", async () => {
    await writeFile(
      join(templateDir, "test.ts"),
      'const display = "__MODULE_DISPLAY_NAME__";',
    );

    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir,
      monorepoRoot,
    });

    const content = await readFile(join(outputDir, "test.ts"), "utf-8");
    expect(content).toBe('const display = "My Orders";');
  });

  it("replaces __MODULE_PACKAGE_NAME__ placeholder", async () => {
    await writeFile(
      join(templateDir, "test.ts"),
      'const pkg = "__MODULE_PACKAGE_NAME__";',
    );

    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir,
      monorepoRoot,
    });

    const content = await readFile(join(outputDir, "test.ts"), "utf-8");
    expect(content).toBe('const pkg = "@hexalith/my-orders";');
  });

  it("replaces Example prefix in PascalCase identifiers", async () => {
    await writeFile(
      join(templateDir, "test.ts"),
      "export function ExampleListPage() {}\nexport type ExampleSchema = {};",
    );

    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir,
      monorepoRoot,
    });

    const content = await readFile(join(outputDir, "test.ts"), "utf-8");
    expect(content).toContain("MyOrdersListPage");
    expect(content).toContain("MyOrdersSchema");
    expect(content).not.toContain("ExampleListPage");
  });

  it("does NOT replace standalone 'Example' in comments", async () => {
    await writeFile(
      join(templateDir, "test.ts"),
      "// See Example usage below\nexport function ExampleComponent() {}",
    );

    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir,
      monorepoRoot,
    });

    const content = await readFile(join(outputDir, "test.ts"), "utf-8");
    expect(content).toContain("See Example usage below");
    expect(content).toContain("MyOrdersComponent");
  });

  it("normalizes CRLF to LF in text files", async () => {
    await writeFile(join(templateDir, "test.ts"), "line1\r\nline2\r\n");

    await scaffold({
      moduleName: "test-mod",
      outputDir,
      templateDir,
      monorepoRoot,
    });

    const content = await readFile(join(outputDir, "test.ts"), "utf-8");
    expect(content).not.toContain("\r\n");
    expect(content).toBe("line1\nline2\n");
  });

  it("generates correct display name", async () => {
    await writeFile(
      join(templateDir, "test.ts"),
      '"__MODULE_DISPLAY_NAME__"',
    );

    await scaffold({
      moduleName: "cool-widget",
      outputDir,
      templateDir,
      monorepoRoot,
    });

    const content = await readFile(join(outputDir, "test.ts"), "utf-8");
    expect(content).toBe('"Cool Widget"');
  });

  it("generates correct package name", async () => {
    await writeFile(
      join(templateDir, "test.ts"),
      '"__MODULE_PACKAGE_NAME__"',
    );

    await scaffold({
      moduleName: "cool-widget",
      outputDir,
      templateDir,
      monorepoRoot,
    });

    const content = await readFile(join(outputDir, "test.ts"), "utf-8");
    expect(content).toBe('"@hexalith/cool-widget"');
  });

  it("creates a standalone stylelint config for scaffolded modules", async () => {
    await writeFile(
      join(templateDir, ".stylelintrc.json"),
      JSON.stringify(
        {
          plugins: ["./node_modules/@hexalith/ui/dist/tokenCompliance.js"],
          rules: {
            "hexalith/no-hardcoded-colors": true,
          },
        },
        null,
        2,
      ),
    );

    await scaffold({
      moduleName: "my-orders",
      outputDir,
      templateDir,
      monorepoRoot,
    });

    const content = await readFile(join(outputDir, ".stylelintrc.json"), "utf-8");
    expect(content).toContain("@hexalith/ui/dist/tokenCompliance.js");
    expect(content).toContain("hexalith/no-hardcoded-colors");
  });
});

describe("checkDirectoryExists", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `check-dir-test-${Date.now()}`);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it("returns true for existing directory", async () => {
    await mkdir(tempDir, { recursive: true });
    expect(await checkDirectoryExists(tempDir)).toBe(true);
  });

  it("returns false for non-existent directory", async () => {
    expect(await checkDirectoryExists(join(tempDir, "nope"))).toBe(false);
  });
});
