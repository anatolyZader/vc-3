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
      
      // Temporarily relax some rules to focus on functionality
      'no-unused-vars': 'warn',
      'no-undef': 'warn', 
      'no-useless-escape': 'warn',
      'no-const-assign': 'error', // Keep this as error
      'no-case-declarations': 'warn',
      'no-control-regex': 'warn'
    },
  },
];
