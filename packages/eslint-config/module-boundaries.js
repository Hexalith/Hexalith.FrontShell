export default [
  {
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
              message: "Use barrel exports only. Deep package imports are not allowed.",
            },
            {
              group: ["@emotion/*"],
              message: "Use CSS Modules instead of Emotion.",
            },
          ],
          paths: [
            {
              name: "oidc-client-ts",
              message: "Import from @hexalith/shell-api instead.",
            },
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
            {
              name: "@emotion/styled",
              message: "Use CSS Modules instead of Emotion.",
            },
            {
              name: "@emotion/css",
              message: "Use CSS Modules instead of Emotion.",
            },
            {
              name: "@stitches/react",
              message: "Use CSS Modules instead of Stitches.",
            },
          ],
        },
      ],
    },
  },
];
