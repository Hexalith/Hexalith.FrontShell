import base from "@hexalith/eslint-config/base";
import boundaries from "@hexalith/eslint-config/module-boundaries";

export default [
  ...base,
  ...boundaries,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@radix-ui/*"],
              message: "Import from @hexalith/ui instead of @radix-ui directly.",
            },
            {
              group: ["@hexalith/*/src/**"],
              message:
                "Use barrel exports only. Deep package imports are not allowed.",
            },
            {
              group: ["@emotion/*"],
              message: "Use CSS Modules instead of Emotion.",
            },
          ],
          paths: [
            {
              name: "ky",
              message: "Import from @hexalith/cqrs-client instead.",
            },
            {
              name: "@tanstack/react-query",
              message: "Import from @hexalith/cqrs-client instead.",
            },
            {
              name: "styled-components",
              message: "Use CSS Modules instead of styled-components.",
            },
          ],
        },
      ],
    },
  },
];
