const RESERVED_WORDS = new Set([
  "abstract",
  "arguments",
  "await",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "double",
  "else",
  "enum",
  "eval",
  "export",
  "extends",
  "false",
  "final",
  "finally",
  "float",
  "for",
  "function",
  "goto",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "int",
  "interface",
  "let",
  "long",
  "native",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "volatile",
  "while",
  "with",
  "yield",
]);

const MODULE_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validateModuleName(name: string): string | null {
  if (!name) {
    return "Module name is required. Usage: pnpm create-module <module-name>";
  }

  if (name.length > 50) {
    return `Module name must be 50 characters or fewer (got ${name.length}).`;
  }

  if (!MODULE_NAME_PATTERN.test(name)) {
    return "Module name must be lowercase alphanumeric with hyphens (e.g., 'my-orders'). No leading/trailing hyphens, no consecutive hyphens.";
  }

  if (RESERVED_WORDS.has(name)) {
    return `'${name}' is a JavaScript reserved word and cannot be used as a module name.`;
  }

  return null;
}
