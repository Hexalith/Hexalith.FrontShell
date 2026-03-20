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
          paths: [
            {
              name: "@tanstack/react-table",
              message: "Import from @hexalith/ui instead of @tanstack/react-table directly.",
            },
          ],
        },
      ],
    },
  },
];
