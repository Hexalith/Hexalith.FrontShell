const fs = require("node:fs");
const path = require("node:path");

let hasReportedPeerDependencyWarnings = false;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseVersion(version) {
  const stablePart = version.split("-")[0];
  const [major, minor, patch] = stablePart
    .split(".")
    .map((value) => Number.parseInt(value, 10));

  if ([major, minor, patch].some((value) => Number.isNaN(value))) {
    return null;
  }

  return { major, minor, patch };
}

function compareVersions(left, right) {
  if (left.major !== right.major) {
    return left.major - right.major;
  }

  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }

  return left.patch - right.patch;
}

function satisfiesRange(actualVersion, range) {
  if (!range || range.startsWith("workspace:")) {
    return true;
  }

  const actual = parseVersion(actualVersion);
  if (!actual) {
    return false;
  }

  if (/^\d+\.\d+\.\d+$/.test(range)) {
    return actualVersion === range;
  }

  if (/^[~^]\d+\.\d+\.\d+$/.test(range)) {
    const operator = range[0];
    const base = parseVersion(range.slice(1));

    if (!base || compareVersions(actual, base) < 0) {
      return false;
    }

    if (operator === "~") {
      return actual.major === base.major && actual.minor === base.minor;
    }

    if (base.major > 0) {
      return actual.major === base.major;
    }

    if (base.minor > 0) {
      return actual.major === 0 && actual.minor === base.minor;
    }

    return (
      actual.major === 0 && actual.minor === 0 && actual.patch === base.patch
    );
  }

  return true;
}

function collectPeerDependencyMismatches(rootDir) {
  const modulesDir = path.join(rootDir, "modules");
  if (!fs.existsSync(modulesDir)) {
    return [];
  }

  const workspaceVersions = {
    "@hexalith/shell-api": readJson(
      path.join(rootDir, "packages", "shell-api", "package.json"),
    ).version,
    "@hexalith/cqrs-client": readJson(
      path.join(rootDir, "packages", "cqrs-client", "package.json"),
    ).version,
    "@hexalith/ui": readJson(
      path.join(rootDir, "packages", "ui", "package.json"),
    ).version,
  };

  const mismatches = [];

  for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packageJsonPath = path.join(modulesDir, entry.name, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }

    const pkg = readJson(packageJsonPath);
    const peerDependencies = pkg.peerDependencies ?? {};

    for (const packageName of Object.keys(workspaceVersions)) {
      const expectedRange = peerDependencies[packageName];
      if (!expectedRange) {
        continue;
      }

      const actualVersion = workspaceVersions[packageName];
      if (!satisfiesRange(actualVersion, expectedRange)) {
        mismatches.push({
          moduleName: pkg.name ?? entry.name,
          packageName,
          expectedRange,
          actualVersion,
          packageJsonPath,
        });
      }
    }
  }

  return mismatches;
}

function reportPeerDependencyWarnings() {
  if (hasReportedPeerDependencyWarnings) {
    return;
  }

  hasReportedPeerDependencyWarnings = true;
  const mismatches = collectPeerDependencyMismatches(__dirname);

  if (mismatches.length === 0) {
    return;
  }

  console.warn(
    "[hexalith] Peer dependency validation warnings detected during pnpm install:",
  );

  for (const mismatch of mismatches) {
    console.warn(
      `[hexalith] Module ${mismatch.moduleName} requires ${mismatch.packageName} ${mismatch.expectedRange} but workspace has ${mismatch.actualVersion} — update your peerDependency version in ${path.relative(__dirname, mismatch.packageJsonPath)}`,
    );
  }
}

module.exports = {
  hooks: {
    afterAllResolved(lockfile) {
      reportPeerDependencyWarnings();
      return lockfile;
    },
  },
};
