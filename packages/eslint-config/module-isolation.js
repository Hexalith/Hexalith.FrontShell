import boundaries from "./module-boundaries.js";

const boundaryConfig = boundaries[0].rules["no-restricted-imports"][1];

export default [
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...boundaryConfig.patterns,
            {
              group: [
                "@hexalith/*",
                "!@hexalith/shell-api",
                "!@hexalith/cqrs-client",
                "!@hexalith/ui",
              ],
              message:
                "Cross-module imports are forbidden. Modules can only depend on @hexalith/shell-api, @hexalith/cqrs-client, and @hexalith/ui. All shared code flows through these packages.",
            },
            {
              group: ["**/modules/**"],
              message:
                "Cross-module imports via relative paths are forbidden. Use @hexalith/* packages for shared code.",
            },
            {
              group: [
                "../../*/src/**",
                "../../../*/src/**",
                "../../../../*/src/**",
                "../../../../../*/src/**",
              ],
              message:
                "Cross-module imports via relative paths are forbidden. Use @hexalith/shell-api, @hexalith/cqrs-client, and @hexalith/ui for shared code.",
            },
          ],
          paths: [...boundaryConfig.paths],
        },
      ],
    },
  },
];
