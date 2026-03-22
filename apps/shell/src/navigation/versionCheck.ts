const STORAGE_KEY = "hexalith-shell-version";
const META_NAME = "hexalith-shell-version";

export function getShellVersion(): string {
  const meta = document.querySelector(`meta[name="${META_NAME}"]`);
  return meta?.getAttribute("content") ?? "unknown";
}

export function checkVersionMismatch(): boolean {
  const currentVersion = getShellVersion();
  const storedVersion = sessionStorage.getItem(STORAGE_KEY);
  return storedVersion !== currentVersion;
}

export function recordCurrentVersion(): void {
  const currentVersion = getShellVersion();
  sessionStorage.setItem(STORAGE_KEY, currentVersion);
}
