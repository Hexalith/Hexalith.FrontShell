import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: true,
    clean: true,
  },
  {
    entry: { tokenCompliance: "src/utils/tokenCompliance.ts" },
    format: ["esm"],
    dts: false,
    external: ["stylelint"],
  },
]);
