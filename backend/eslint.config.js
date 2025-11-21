const globals = require("globals");
const pluginJs = require("@eslint/js");
const airbnbBase = require("eslint-config-airbnb-base");

// Combine Airbnb rules explicitly with the recommended rules
const airbnbRules = airbnbBase.rules;

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
    rules: {
      ...pluginJs.configs.recommended.rules, // ESLint recommended rules
      ...airbnbRules, 
    },
  },
];
