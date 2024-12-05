const globals = require("globals");
const pluginJs = require("@eslint/js");

module.exports = [
  {
    files: ["**/*.js"],  
    languageOptions: {
      sourceType: "commonjs",  
      globals: {
        ...globals.node, // Node.js global variables
        ...globals.jest, // Jest global variables (describe, it, expect, etc.)
      },
    },
    ...pluginJs.configs.recommended, // Spread in the recommended ESLint config
  },
];
