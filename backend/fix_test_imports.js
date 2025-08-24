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
  const module = pathParts[2]; // api, git, wiki, etc.
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
  '_tests_/business_modules/wiki/domain/ports/IWikiAiPort.test.js',
  '_tests_/business_modules/wiki/domain/ports/IWikiPersistPort.test.js',
  '_tests_/business_modules/wiki/domain/ports/IWikiGitPort.test.js',
  '_tests_/business_modules/wiki/domain/ports/IWikiMessagingPort.test.js',
  '_tests_/business_modules/wiki/domain/value_objects/wikiRepoId.test.js',
  '_tests_/business_modules/wiki/domain/value_objects/wikiPageTitle.test.js',
  '_tests_/business_modules/wiki/domain/value_objects/wikiContent.test.js',
  '_tests_/business_modules/wiki/domain/value_objects/wikiPageId.test.js',
  '_tests_/business_modules/wiki/domain/events/wikiPageDeletedEvent.test.js',
  '_tests_/business_modules/wiki/domain/events/wikiPageUpdatedEvent.test.js',
  '_tests_/business_modules/wiki/domain/events/wikiFetchedEvent.test.js',
  '_tests_/business_modules/wiki/domain/events/wikiPageCreatedEvent.test.js',
  '_tests_/business_modules/wiki/domain/entities/wikiPage.test.js',
  '_tests_/business_modules/wiki/domain/entities/wiki.test.js'
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
