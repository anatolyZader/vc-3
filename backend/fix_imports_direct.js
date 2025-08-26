#!/usr/bin/env node
'use strict';

const fs = require('fs');

// Direct path mappings for each broken test file
const fixes = [
  {
    file: '_tests_/business_modules/api/domain/entities/httpApi.test.js',
    oldRequire: /const HttpApi = require\('.*?'\);/,
    newRequire: "const HttpApi = require('../../../../business_modules/api/domain/entities/httpApi.js');"
  },
  {
    file: '_tests_/business_modules/api/domain/ports/IApiPort.test.js',
    oldRequire: /const IApiPort = require\('.*?'\);/,
    newRequire: "const IApiPort = require('../../../../business_modules/api/domain/ports/IApiPort');"
  },
  {
    file: '_tests_/business_modules/api/domain/ports/IApiPersistPort.test.js',
    oldRequire: /const IApiPersistPort = require\('.*?'\);/,
    newRequire: "const IApiPersistPort = require('../../../../business_modules/api/domain/ports/IApiPersistPort');"
  },
  {
    file: '_tests_/business_modules/api/domain/value_objects/httpApiSpec.test.js',
    oldRequire: /const HttpApiSpec = require\('.*?'\);/,
    newRequire: "const HttpApiSpec = require('../../../../business_modules/api/domain/value_objects/httpApiSpec');"
  },
  {
    file: '_tests_/business_modules/api/domain/value_objects/repoId.test.js',
    oldRequire: /const RepoId = require\('.*?'\);/,
    newRequire: "const RepoId = require('../../../../business_modules/api/domain/value_objects/repoId');"
  },
  {
    file: '_tests_/business_modules/api/domain/value_objects/userId.test.js',
    oldRequire: /const UserId = require\('.*?'\);/,
    newRequire: "const UserId = require('../../../../business_modules/api/domain/value_objects/userId');"
  },
  {
    file: '_tests_/business_modules/api/domain/events/httpApiFetchedEvent.test.js',
    oldRequire: /const HttpApiFetchedEvent = require\('.*?'\);/,
    newRequire: "const HttpApiFetchedEvent = require('../../../../business_modules/api/domain/events/httpApiFetchedEvent');"
  },
  {
    file: '_tests_/business_modules/api/domain/events/httpApiSavedEvent.test.js',
    oldRequire: /const HttpApiSavedEvent = require\('.*?'\);/,
    newRequire: "const HttpApiSavedEvent = require('../../../../business_modules/api/domain/events/httpApiSavedEvent');"
  },
  // Git module
  {
    file: '_tests_/business_modules/git/domain/ports/IGitPort.test.js',
    oldRequire: /const IGitPort = require\('.*?'\);/,
    newRequire: "const IGitPort = require('../../../../business_modules/git/domain/ports/IGitPort');"
  },
  {
    file: '_tests_/business_modules/git/domain/ports/IGitPersistPort.test.js',
    oldRequire: /const IGitPersistPort = require\('.*?'\);/,
    newRequire: "const IGitPersistPort = require('../../../../business_modules/git/domain/ports/IGitPersistPort');"
  },
  {
    file: '_tests_/business_modules/git/domain/value_objects/projectId.test.js',
    oldRequire: /const ProjectId = require\('.*?'\);/,
    newRequire: "const ProjectId = require('../../../../business_modules/git/domain/value_objects/projectId');"
  },
  {
    file: '_tests_/business_modules/git/domain/value_objects/repoId.test.js',
    oldRequire: /const RepoId = require\('.*?'\);/,
    newRequire: "const RepoId = require('../../../../business_modules/git/domain/value_objects/repoId');"
  },
  {
    file: '_tests_/business_modules/git/domain/value_objects/userId.test.js',
    oldRequire: /const UserId = require\('.*?'\);/,
    newRequire: "const UserId = require('../../../../business_modules/git/domain/value_objects/userId');"
  },
  // Docs module  
  {
    file: '_tests_/business_modules/docs/domain/entities/docs.test.js',
    oldRequire: /const Docs = require\('.*?'\);/,
    newRequire: "const Docs = require('../../../../business_modules/docs/domain/entities/docs');"
  },
  {
    file: '_tests_/business_modules/docs/domain/entities/docsPage.test.js',
    oldRequire: /const DocsPage = require\('.*?'\);/,
    newRequire: "const DocsPage = require('../../../../business_modules/docs/domain/entities/docsPage');"
  },
  {
    file: '_tests_/business_modules/docs/domain/ports/IDocsAiPort.test.js',
    oldRequire: /const IDocsAiPort = require\('.*?'\);/,
    newRequire: "const IDocsAiPort = require('../../../../business_modules/docs/domain/ports/IDocsAiPort');"
  },
  {
    file: '_tests_/business_modules/docs/domain/ports/IDocsGitPort.test.js',
    oldRequire: /const IDocsGitPort = require\('.*?'\);/,
    newRequire: "const IDocsGitPort = require('../../../../business_modules/docs/domain/ports/IDocsGitPort');"
  },
  {
    file: '_tests_/business_modules/docs/domain/ports/IDocsMessagingPort.test.js',
    oldRequire: /const IDocsMessagingPort = require\('.*?'\);/,
    newRequire: "const IDocsMessagingPort = require('../../../../business_modules/docs/domain/ports/IDocsMessagingPort');"
  },
  {
    file: '_tests_/business_modules/docs/domain/ports/IDocsPersistPort.test.js',
    oldRequire: /const IDocsPostgresPort = require\('.*?'\);/,
    newRequire: "const IDocsPostgresPort = require('../../../../business_modules/docs/domain/ports/IDocsPersistPort');"
  },
  {
    file: '_tests_/business_modules/docs/domain/value_objects/docsContent.test.js',
    oldRequire: /const DocsContent = require\('.*?'\);/,
    newRequire: "const DocsContent = require('../../../../business_modules/docs/domain/value_objects/docsContent');"
  },
  {
    file: '_tests_/business_modules/docs/domain/value_objects/docsPageId.test.js',
    oldRequire: /const DocsPageId = require\('.*?'\);/,
    newRequire: "const DocsPageId = require('../../../../business_modules/docs/domain/value_objects/docsPageId');"
  },
  {
    file: '_tests_/business_modules/docs/domain/value_objects/docsPageTitle.test.js',
    oldRequire: /const DocsPageTitle = require\('.*?'\);/,
    newRequire: "const DocsPageTitle = require('../../../../business_modules/docs/domain/value_objects/docsPageTitle');"
  },
  {
    file: '_tests_/business_modules/docs/domain/value_objects/docsRepoId.test.js',
    oldRequire: /const DocsRepoId = require\('.*?'\);/,
    newRequire: "const DocsRepoId = require('../../../../business_modules/docs/domain/value_objects/docsRepoId');"
  },
  {
    file: '_tests_/business_modules/docs/domain/events/docsFetchedEvent.test.js',
    oldRequire: /const DocsFetchedEvent = require\('.*?'\);/,
    newRequire: "const DocsFetchedEvent = require('../../../../business_modules/docs/domain/events/docsFetchedEvent');"
  },
  {
    file: '_tests_/business_modules/docs/domain/events/docsPageCreatedEvent.test.js',
    oldRequire: /const DocsPageCreatedEvent = require\('.*?'\);/,
    newRequire: "const DocsPageCreatedEvent = require('../../../../business_modules/docs/domain/events/docsPageCreatedEvent');"
  },
  {
    file: '_tests_/business_modules/docs/domain/events/docsPageDeletedEvent.test.js',
    oldRequire: /const DocsPageDeletedEvent = require\('.*?'\);/,
    newRequire: "const DocsPageDeletedEvent = require('../../../../business_modules/docs/domain/events/docsPageDeletedEvent');"
  },
  {
    file: '_tests_/business_modules/docs/domain/events/docsPageUpdatedEvent.test.js',
    oldRequire: /const DocsPageUpdatedEvent = require\('.*?'\);/,
    newRequire: "const DocsPageUpdatedEvent = require('../../../../business_modules/docs/domain/events/docsPageUpdatedEvent');"
  }
];

console.log('🔧 Fixing test import paths (direct approach)...\n');

fixes.forEach(({file, oldRequire, newRequire}) => {
  try {
    console.log(`Fixing ${file}`);
    const content = fs.readFileSync(file, 'utf8');
    const fixedContent = content.replace(oldRequire, newRequire);
    
    if (content !== fixedContent) {
      fs.writeFileSync(file, fixedContent);
      console.log(`  ✅ Fixed import path`);
    } else {
      console.log(`  ⏭️  No changes needed`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${file}:`, error.message);
  }
});

console.log('\n✅ Import path fixing complete!');
