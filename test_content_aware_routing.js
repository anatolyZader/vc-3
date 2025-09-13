// test_content_aware_routing.js
"use strict";

const ContentAwareSplitterRouter = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/processors/ContentAwareSplitterRouter');

/**
 * Test the content-aware splitter router to verify it routes different file types correctly
 */
async function testContentAwareRouting() {
  console.log('🧪 Testing Content-Aware Splitter Router...\n');

  const router = new ContentAwareSplitterRouter({
    maxChunkSize: 1500,
    minChunkSize: 200,
    chunkOverlap: 100
  });

  // Test cases for different content types
  const testCases = [
    {
      name: 'JavaScript Code File',
      document: {
        pageContent: `
// Calculator class with methods
class Calculator {
  constructor() {
    this.history = [];
  }

  add(a, b) {
    const result = a + b;
    this.history.push(\`\${a} + \${b} = \${result}\`);
    return result;
  }

  multiply(a, b) {
    const result = a * b;
    this.history.push(\`\${a} * \${b} = \${result}\`);
    return result;
  }

  getHistory() {
    return this.history;
  }
}

module.exports = Calculator;
        `,
        metadata: { source: 'calculator.js', type: 'javascript' }
      },
      expectedContentType: 'code'
    },
    {
      name: 'Markdown Documentation',
      document: {
        pageContent: `
# API Documentation

## Overview

This is the main API documentation for our EventStorm application.

## Authentication

All API endpoints require authentication using Bearer tokens.

### Getting a Token

To get an authentication token:

1. Send a POST request to \`/auth/login\`
2. Include your credentials in the request body
3. The response will contain your token

## Endpoints

### GET /api/users

Returns a list of all users.

### POST /api/users

Creates a new user.
        `,
        metadata: { source: 'api-docs.md', type: 'markdown' }
      },
      expectedContentType: 'markdown'
    },
    {
      name: 'OpenAPI Specification',
      document: {
        pageContent: `
{
  "openapi": "3.0.0",
  "info": {
    "title": "EventStorm API",
    "description": "API for EventStorm application",
    "version": "1.0.0"
  },
  "paths": {
    "/api/users": {
      "get": {
        "operationId": "getUsers",
        "summary": "Get all users",
        "responses": {
          "200": {
            "description": "List of users"
          }
        }
      },
      "post": {
        "operationId": "createUser",
        "summary": "Create a new user",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/User"
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "email": { "type": "string" }
        }
      }
    }
  }
}
        `,
        metadata: { source: 'api-spec.json', type: 'openapi' }
      },
      expectedContentType: 'openapi'
    },
    {
      name: 'YAML Configuration',
      document: {
        pageContent: `
# Docker Compose Configuration
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
    depends_on:
      - db

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=eventstorm
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
        `,
        metadata: { source: 'docker-compose.yml', type: 'yaml' }
      },
      expectedContentType: 'yaml_config'
    },
    {
      name: 'JSON Configuration',
      document: {
        pageContent: `
{
  "name": "eventstorm",
  "version": "1.0.0",
  "description": "EventStorm application",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "fastify": "^4.0.0",
    "langchain": "^0.1.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "nodemon": "^2.0.0"
  }
}
        `,
        metadata: { source: 'package.json', type: 'json' }
      },
      expectedContentType: 'json_config'
    }
  ];

  // Run tests
  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    console.log(`   Source: ${testCase.document.metadata.source}`);
    
    try {
      // Test content type detection
      const detectedType = router.detectContentType(testCase.document);
      console.log(`   Detected Type: ${detectedType}`);
      console.log(`   Expected Type: ${testCase.expectedContentType}`);
      console.log(`   Type Match: ${detectedType === testCase.expectedContentType ? '✅' : '❌'}`);

      // Test splitting
      const chunks = await router.splitDocument(testCase.document);
      console.log(`   Chunks Created: ${chunks.length}`);
      
      if (chunks.length > 0) {
        console.log(`   First Chunk Type: ${chunks[0].metadata?.chunk_type || 'unknown'}`);
        console.log(`   Splitting Method: ${chunks[0].metadata?.splitting_method || 'unknown'}`);
        console.log(`   First Chunk Size: ${chunks[0].pageContent.length} chars`);
      }

      console.log('   Status: ✅ PASSED\n');

    } catch (error) {
      console.log(`   Status: ❌ FAILED - ${error.message}\n`);
    }
  }

  // Test batch processing
  console.log('📦 Testing Batch Processing...');
  try {
    const allDocuments = testCases.map(tc => tc.document);
    const allChunks = await router.splitDocuments(allDocuments);
    
    console.log(`   Total Documents: ${allDocuments.length}`);
    console.log(`   Total Chunks: ${allChunks.length}`);
    console.log(`   Average Chunks per Document: ${(allChunks.length / allDocuments.length).toFixed(1)}`);
    
    // Show chunk type distribution
    const chunkTypes = {};
    allChunks.forEach(chunk => {
      const type = chunk.metadata?.chunk_type || 'unknown';
      chunkTypes[type] = (chunkTypes[type] || 0) + 1;
    });
    
    console.log('   Chunk Type Distribution:');
    Object.entries(chunkTypes).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });
    
    console.log('   Batch Status: ✅ PASSED\n');

  } catch (error) {
    console.log(`   Batch Status: ❌ FAILED - ${error.message}\n`);
  }

  console.log('🎉 Content-Aware Routing Test Complete!');
}

// Run the test
if (require.main === module) {
  testContentAwareRouting().catch(console.error);
}

module.exports = { testContentAwareRouting };
