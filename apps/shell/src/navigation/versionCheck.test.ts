import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  checkVersionMismatch,
  getShellVersion,
  recordCurrentVersion,
} from "./versionCheck";

describe("versionCheck", () => {
  let metaElement: HTMLMetaElement;

  beforeEach(() => {
    sessionStorage.clear();
    metaElement = document.createElement("meta");
    metaElement.setAttribute("name", "hexalith-shell-version");
    metaElement.setAttribute("content", "1.0.0");
    document.head.appendChild(metaElement);
  });

  afterEach(() => {
    metaElement.remove();
    sessionStorage.clear();
  });

  it("getShellVersion() reads from meta tag", () => {
    expect(getShellVersion()).toBe("1.0.0");
  });

  it("getShellVersion() returns 'unknown' when meta tag is missing", () => {
    metaElement.remove();
    expect(getShellVersion()).toBe("unknown");
  });

  it("checkVersionMismatch() returns false when versions match", () => {
    sessionStorage.setItem("hexalith-shell-version", "1.0.0");
    expect(checkVersionMismatch()).toBe(false);
  });

  it("checkVersionMismatch() returns true when versions differ", () => {
    sessionStorage.setItem("hexalith-shell-version", "0.9.0");
    expect(checkVersionMismatch()).toBe(true);
  });

  it("checkVersionMismatch() returns true on first visit (no stored version)", () => {
    expect(checkVersionMismatch()).toBe(true);
  });

  it("recordCurrentVersion() stores version in sessionStorage", () => {
    recordCurrentVersion();
    expect(sessionStorage.getItem("hexalith-shell-version")).toBe("1.0.0");
  });

  it("recordCurrentVersion() followed by checkVersionMismatch() returns false", () => {
    recordCurrentVersion();
    expect(checkVersionMismatch()).toBe(false);
  });
});
