import base from "@hexalith/eslint-config/base";
import boundaries from "@hexalith/eslint-config/module-boundaries";
import react from "@hexalith/eslint-config/react";

export default [...base, ...react, ...boundaries];
