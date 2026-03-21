import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_HEXALITH_VERSION_RANGE,
  readWorkspaceVersions,
} from "./versionCheck.js";

describe("readWorkspaceVersions", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `version-test-${Date.now()}`);
    await mkdir(join(tempDir, "packages", "shell-api"), { recursive: true });
    await mkdir(join(tempDir, "packages", "cqrs-client"), { recursive: true });
    await mkdir(join(tempDir, "packages", "ui"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("reads version fields from workspace packages", async () => {
    await writeFile(
      join(tempDir, "packages", "shell-api", "package.json"),
      JSON.stringify({ name: "@hexalith/shell-api", version: "1.0.0" }),
    );
    await writeFile(
      join(tempDir, "packages", "cqrs-client", "package.json"),
      JSON.stringify({ name: "@hexalith/cqrs-client", version: "2.0.0" }),
    );
    await writeFile(
      join(tempDir, "packages", "ui", "package.json"),
      JSON.stringify({ name: "@hexalith/ui", version: "3.0.0" }),
    );

    const versions = await readWorkspaceVersions(tempDir);

    expect(versions.shellApi).toBe("^1.0.0");
    expect(versions.cqrsClient).toBe("^2.0.0");
    expect(versions.ui).toBe("^3.0.0");
  });

  it("falls back to the default version range when version field is missing", async () => {
    await writeFile(
      join(tempDir, "packages", "shell-api", "package.json"),
      JSON.stringify({ name: "@hexalith/shell-api" }),
    );
    await writeFile(
      join(tempDir, "packages", "cqrs-client", "package.json"),
      JSON.stringify({ name: "@hexalith/cqrs-client" }),
    );
    await writeFile(
      join(tempDir, "packages", "ui", "package.json"),
      JSON.stringify({ name: "@hexalith/ui" }),
    );

    const versions = await readWorkspaceVersions(tempDir);

    expect(versions.shellApi).toBe(DEFAULT_HEXALITH_VERSION_RANGE);
    expect(versions.cqrsClient).toBe(DEFAULT_HEXALITH_VERSION_RANGE);
    expect(versions.ui).toBe(DEFAULT_HEXALITH_VERSION_RANGE);
  });

  it("preserves explicit version ranges without adding another caret", async () => {
    await writeFile(
      join(tempDir, "packages", "shell-api", "package.json"),
      JSON.stringify({ name: "@hexalith/shell-api", version: "^1.2.3" }),
    );
    await writeFile(
      join(tempDir, "packages", "cqrs-client", "package.json"),
      JSON.stringify({ name: "@hexalith/cqrs-client", version: "~2.3.4" }),
    );
    await writeFile(
      join(tempDir, "packages", "ui", "package.json"),
      JSON.stringify({ name: "@hexalith/ui", version: ">=3.4.5" }),
    );

    const versions = await readWorkspaceVersions(tempDir);

    expect(versions.shellApi).toBe("^1.2.3");
    expect(versions.cqrsClient).toBe("~2.3.4");
    expect(versions.ui).toBe(">=3.4.5");
  });

  it("throws when package.json is missing", async () => {
    await rm(join(tempDir, "packages", "shell-api", "package.json"), { force: true });

    await expect(readWorkspaceVersions(tempDir)).rejects.toThrow();
  });
});
