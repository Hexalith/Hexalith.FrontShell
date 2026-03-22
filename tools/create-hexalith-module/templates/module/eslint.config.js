import base from "@hexalith/eslint-config/base";
import react from "@hexalith/eslint-config/react";
import isolation from "@hexalith/eslint-config/module-isolation";

export default [...base, ...react, ...isolation];
