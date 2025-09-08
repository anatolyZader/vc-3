#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Mapping of modules and their directory structures
const fixImports = (filePath) => {
  console.log(`Fixing imports in: ${filePath}`);
  
  // Read the file content
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract module and layer from file path
  // e.g., _tests_/business_modules/api/domain/ports/IApiPort.test.js
  const pathParts = filePath.split('/');
  const module = pathParts[2]; // api, git, docs, etc.
  const layer = pathParts[4];  // ports, entities, events, value_objects
  
  // Replace relative imports
  const fixedContent = content.replace(
    /require\('\.\.\/(.*?)'\)/g, 
    (match, fileName) => {
      const newPath = `../../../../business_modules/${module}/domain/${layer}/${fileName}.js`;
      console.log(`  ${match} -> require('${newPath}')`);
      return `require('${newPath}')`;
    }
  );
  
  // Write back the fixed content
  if (content !== fixedContent) {
    fs.writeFileSync(filePath, fixedContent);
    console.log(`  ✅ Fixed ${filePath}`);
  } else {
    console.log(`  ⏭️  No changes needed for ${filePath}`);
  }
};

// Get all failing test files from command line args or find them
const testFiles = [
  '_tests_/business_modules/api/domain/ports/IApiPort.test.js',
  '_tests_/business_modules/api/domain/ports/IApiPersistPort.test.js',
  '_tests_/business_modules/api/domain/value_objects/repoId.test.js',
  '_tests_/business_modules/api/domain/value_objects/userId.test.js',
  '_tests_/business_modules/api/domain/value_objects/httpApiSpec.test.js',
  '_tests_/business_modules/api/domain/events/httpApiFetchedEvent.test.js',
  '_tests_/business_modules/api/domain/events/httpApiSavedEvent.test.js',
  '_tests_/business_modules/api/domain/entities/httpApi.test.js',
  '_tests_/business_modules/git/domain/ports/IGitPersistPort.test.js',
  '_tests_/business_modules/git/domain/ports/IGitPort.test.js',
  '_tests_/business_modules/git/domain/value_objects/repoId.test.js',
  '_tests_/business_modules/git/domain/value_objects/userId.test.js',
  '_tests_/business_modules/git/domain/value_objects/projectId.test.js',
  '_tests_/business_modules/docs/domain/ports/IDocsAiPort.test.js',
  '_tests_/business_modules/docs/domain/ports/IDocsPersistPort.test.js',
  '_tests_/business_modules/docs/domain/ports/IDocsGitPort.test.js',
  '_tests_/business_modules/docs/domain/ports/IDocsMessagingPort.test.js',
  '_tests_/business_modules/docs/domain/value_objects/docsRepoId.test.js',
  '_tests_/business_modules/docs/domain/value_objects/docsPageTitle.test.js',
  '_tests_/business_modules/docs/domain/value_objects/docsContent.test.js',
  '_tests_/business_modules/docs/domain/value_objects/docsPageId.test.js',
  '_tests_/business_modules/docs/domain/events/docsPageDeletedEvent.test.js',
  '_tests_/business_modules/docs/domain/events/docsPageUpdatedEvent.test.js',
  '_tests_/business_modules/docs/domain/events/docsFetchedEvent.test.js',
  '_tests_/business_modules/docs/domain/events/docsPageCreatedEvent.test.js',
  '_tests_/business_modules/docs/domain/entities/docsPage.test.js',
  '_tests_/business_modules/docs/domain/entities/docs.test.js'
];

console.log('🔧 Fixing test import paths...\n');

testFiles.forEach(filePath => {
  try {
    fixImports(filePath);
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

console.log('\n✅ Import path fixing complete!');
