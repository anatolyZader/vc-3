// const globals = require("globals");
// const pluginJs = require("@eslint/js");

// module.exports = [
//   {files: ["**/*.js"], languageOptions: {sourceType: "commonjs"}},
//   {languageOptions: { globals: globals.node }},
//   pluginJs.configs.recommended,
// ];


const globals = require("globals");
const pluginJs = require("@eslint/js");

module.exports = [
  {
    files: ["**/*.js"], // Apply to all JS files
    languageOptions: {
      sourceType: "commonjs", // CommonJS module support
      globals: globals.node,  // Node.js global variables
    },
    ...pluginJs.configs.recommended, // Spread in the recommended ESLint config
  }
];
