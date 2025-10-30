#!/usr/bin/env node

/**
 * Test script to verify CodePreprocessor integration
 */

const CodePreprocessor = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/codePreprocessor');
const { Document } = require('langchain/document');

async function testCodePreprocessor() {
  console.log('�� Testing CodePreprocessor integration...\n');

  try {
    const preprocessor = new CodePreprocessor();

    // Test document with code artifacts
    const testContent = `
import React from 'react';
import { useState } from 'react';

/**
 * JSDoc comment - should be preserved
 * @param {string} name - User name
 */
function greetUser(name) {
  console.log('Debug: greeting user'); // Debug statement
  if (!name) {
    return 'Hello, stranger!';
  }
  return \`Hello, \${name}!\`;
}

class UserManager {
  constructor() {
    this.users = [];
  }
  
  addUser(user) {
    debugger; // Debug statement
    this.users.push(user);
  }
}
`;

    const document = new Document({
      pageContent: testContent,
      metadata: { source: 'test.js', type: 'code' }
    });

    console.log('📄 Original length:', testContent.length);

    // Test preprocessing
    const result = await preprocessor.preprocessCodeDocument(document, {
      excludeImportsFromChunking: true,
      preserveDocComments: true,
      removeLogStatements: true,
      preserveErrorLogs: true
    });

    console.log('✅ Processed length:', result.pageContent.length);
    console.log('📄 Processed content:');
    console.log(result.pageContent);

    console.log('\n✅ CodePreprocessor test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testCodePreprocessor();
}

module.exports = { testCodePreprocessor };
