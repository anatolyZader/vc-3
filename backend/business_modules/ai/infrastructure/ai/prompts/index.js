// index.js
"use strict";

/**
 * Prompt System Exports
 * 
 * Centralized exports for the prompt management system.
 * This makes it easy to import prompt functionality throughout the application.
 */

const { SystemPrompts, PromptSelector } = require('./systemPrompts');
const PromptConfig = require('./promptConfig');
const PromptTester = require('./promptTester');

module.exports = {
  SystemPrompts,
  PromptSelector,
  PromptConfig,
  PromptTester
};
