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
  // Wiki module  
  {
    file: '_tests_/business_modules/wiki/domain/entities/wiki.test.js',
    oldRequire: /const Wiki = require\('.*?'\);/,
    newRequire: "const Wiki = require('../../../../business_modules/wiki/domain/entities/wiki');"
  },
  {
    file: '_tests_/business_modules/wiki/domain/entities/wikiPage.test.js',
    oldRequire: /const WikiPage = require\('.*?'\);/,
    newRequire: "const WikiPage = require('../../../../business_modules/wiki/domain/entities/wikiPage');"
  },
  {
    file: '_tests_/business_modules/wiki/domain/ports/IWikiAiPort.test.js',
    oldRequire: /const IWikiAiPort = require\('.*?'\);/,
    newRequire: "const IWikiAiPort = require('../../../../business_modules/wiki/domain/ports/IWikiAiPort');"
  },
  {
    file: '_tests_/business_modules/wiki/domain/ports/IWikiGitPort.test.js',
    oldRequire: /const IWikiGitPort = require\('.*?'\);/,
    newRequire: "const IWikiGitPort = require('../../../../business_modules/wiki/domain/ports/IWikiGitPort');"
  },
  {
    file: '_tests_/business_modules/wiki/domain/ports/IWikiMessagingPort.test.js',
    oldRequire: /const IWikiMessagingPort = require\('.*?'\);/,
    newRequire: "const IWikiMessagingPort = require('../../../../business_modules/wiki/domain/ports/IWikiMessagingPort');"
  },
  {
    file: '_tests_/business_modules/wiki/domain/ports/IWikiPersistPort.test.js',
    oldRequire: /const IWikiPostgresPort = require\('.*?'\);/,
    newRequire: "const IWikiPostgresPort = require('../../../../business_modules/wiki/domain/ports/IWikiPersistPort');"
  },
  {
    file: '_tests_/business_modules/wiki/domain/value_objects/wikiContent.test.js',
    oldRequire: /const WikiContent = require\('.*?'\);/,
    newRequire: "const WikiContent = require('../../../../business_modules/wiki/domain/value_objects/wikiContent');"
  },
  {
    file: '_tests_/business_modules/wiki/domain/value_objects/wikiPageId.test.js',
    oldRequire: /const WikiPageId = require\('.*?'\);/,
    newRequire: "const WikiPageId = require('../../../../business_modules/wiki/domain/value_objects/wikiPageId');"
  },
  {
    file: '_tests_/business_modules/wiki/domain/value_objects/wikiPageTitle.test.js',
    oldRequire: /const WikiPageTitle = require\('.*?'\);/,
    newRequire: "const WikiPageTitle = require('../../../../business_modules/wiki/domain/value_objects/wikiPageTitle');"
  },
  {
    file: '_tests_/business_modules/wiki/domain/value_objects/wikiRepoId.test.js',
    oldRequire: /const WikiRepoId = require\('.*?'\);/,
    newRequire: "const WikiRepoId = require('../../../../business_modules/wiki/domain/value_objects/wikiRepoId');"
  },
  {
    file: '_tests_/business_modules/wiki/domain/events/wikiFetchedEvent.test.js',
    oldRequire: /const WikiFetchedEvent = require\('.*?'\);/,
    newRequire: "const WikiFetchedEvent = require('../../../../business_modules/wiki/domain/events/wikiFetchedEvent');"
  },
  {
    file: '_tests_/business_modules/wiki/domain/events/wikiPageCreatedEvent.test.js',
    oldRequire: /const WikiPageCreatedEvent = require\('.*?'\);/,
    newRequire: "const WikiPageCreatedEvent = require('../../../../business_modules/wiki/domain/events/wikiPageCreatedEvent');"
  },
  {
    file: '_tests_/business_modules/wiki/domain/events/wikiPageDeletedEvent.test.js',
    oldRequire: /const WikiPageDeletedEvent = require\('.*?'\);/,
    newRequire: "const WikiPageDeletedEvent = require('../../../../business_modules/wiki/domain/events/wikiPageDeletedEvent');"
  },
  {
    file: '_tests_/business_modules/wiki/domain/events/wikiPageUpdatedEvent.test.js',
    oldRequire: /const WikiPageUpdatedEvent = require\('.*?'\);/,
    newRequire: "const WikiPageUpdatedEvent = require('../../../../business_modules/wiki/domain/events/wikiPageUpdatedEvent');"
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
