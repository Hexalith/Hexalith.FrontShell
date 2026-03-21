export function toDisplayName(moduleName: string): string {
  return moduleName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function toPascalCase(moduleName: string): string {
  return moduleName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}
