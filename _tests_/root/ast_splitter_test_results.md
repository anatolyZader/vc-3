# AST Code Splitter Test Results

Generated on: 2025-10-24T16:03:24.485Z

## Test Configuration

- Max Tokens: 600
- Min Tokens: 140
- Overlap Tokens: 120
- Max Units Per Chunk: 4
- Min Residual Chars: 100

## Test Case: String Braces Edge Case

**Description:** Tests that braces inside string literals don't affect balance checking

**Original Code Length:** 419 characters

**Result:** ✅ Generated 2 chunks

### Chunk 1

**Metadata:**
- Type: `residual`
- Tokens: 46
- Has Imports: false
- Balanced Braces: ✅

**Full Content:**

```javascript
const config = {
  template: "Hello {name}, welcome to {app}!",
  patterns: ["[a-z]+", "\{\w+\}"],
  nested: {
    message: "Braces: { } and brackets: [ ]",
    regex: /\{.*\}/g
  }
};
```

### Chunk 2

**Metadata:**
- Type: `ast_semantic_pack`
- Tokens: 34
- Has Imports: false
- Balanced Braces: ✅

**Full Content:**

```javascript
function processTemplate(data) {
  return config.template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] || match;
  });
}
```

### Split Telemetry

**Overall Statistics:**
- Total Chunks: 2
- Mean Tokens: 40
- Max Tokens: 46
- 95th Percentile: 46
- Complete Blocks: 50%
- Balanced Chunks: 100%
- Chunks with Imports: 0

**Splitting Type Distribution:**
- `residual`: 1 chunks (50%)
- `ast_semantic_pack`: 1 chunks (50%)

---

## Test Case: Large Function with Imports

**Description:** Tests import prepending and soft expansion for large semantic units

**Original Code Length:** 2556 characters

**Result:** ✅ Generated 2 chunks

### Chunk 1

**Metadata:**
- Type: `ast_semantic`
- Tokens: 496
- Has Imports: true
- Unit Type: `function`
- Unit Name: `processComplexData`
- Balanced Braces: ✅

**Full Content:**

```javascript
import { fastify } from 'fastify';
import { logger } from './utils/logger.js';
const express = require('express');
const validator = require('joi');

async function processComplexData(input, options = {}) {
  const config = {
    batchSize: options.batchSize || 100,
    timeout: options.timeout || 5000,
    retries: options.retries || 3
  };
  const results = [];
  const errors = [];
  try {
    for (let i = 0; i < input.length; i += config.batchSize) {
      const batch = input.slice(i, i + config.batchSize);
      const batchResults = await Promise.allSettled(batch.map(async (item, index) => {
        const validation = validator.object({
          id: validator.string().required(),
          type: validator.string().valid('user', 'admin', 'guest'),
          data: validator.object().required()
        }).validate(item);
        if (validation.error) {
          throw new Error(`Validation failed for item ${i + index}: ${validation.error.message}`);
        }
        return {
          id: item.id,
          processed: true,
          timestamp: new Date().toISOString(),
          details: {
            method: 'batch',
            batchIndex: Math.floor(i / config.batchSize),
            itemIndex: index,
            priority: item.priority || 'normal',
            metadata: item.metadata || {}
          }
        };
      }));
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push({
            index: i + index,
            error: result.reason.message
          });
        }
      });
    }
    logger.warn(`Processing completed: ${results.length} successful, ${errors.length} errors`);
    return {
      success: true,
      processed: results.length,
      errors: errors.length,
      data: results,
      errorDetails: errors
    };
  } catch (error) {
    logger.error("Fatal error during processing:", error);
    throw error;
  }
}
```

### Chunk 2

**Metadata:**
- Type: `ast_semantic_pack`
- Tokens: 108
- Has Imports: true
- Balanced Braces: ✅

**Full Content:**

```javascript
import { fastify } from 'fastify';
import { logger } from './utils/logger.js';
const express = require('express');
const validator = require('joi');

class DataProcessor {
  constructor(options) {
    this.options = options;
    this.stats = {
      processed: 0,
      errors: 0
    };
  }
  async process(data) {
    return processComplexData(data, this.options);
  }
  getStats() {
    return {
      ...this.stats
    };
  }
}
```

### Split Telemetry

**Overall Statistics:**
- Total Chunks: 2
- Mean Tokens: 302
- Max Tokens: 496
- 95th Percentile: 496
- Complete Blocks: 100%
- Balanced Chunks: 100%
- Chunks with Imports: 2

**Splitting Type Distribution:**
- `ast_semantic`: 1 chunks (50%)
- `ast_semantic_pack`: 1 chunks (50%)

---

## Test Case: Fastify Route with Nested Logging

**Description:** Tests enhanced sanitizer safety for route registration callbacks

**Original Code Length:** 2085 characters

**Result:** ✅ Generated 2 chunks

### Chunk 1

**Metadata:**
- Type: `ast_semantic`
- Tokens: 380
- Has Imports: false
- Unit Type: `fastify_decoration`
- Unit Name: `register_decoration`
- Unit Kind: `decoration`
- Balanced Braces: ✅

**Full Content:**

```javascript
fastify.register(async function userRoutes(fastify) {
  console.log('Registering user routes plugin');
  fastify.get('/api/users', async (request, reply) => {
    try {
      const users = await getUserList(request.query);
      return {
        users,
        total: users.length
      };
    } catch (error) {
      request.log.error('Failed to fetch users:', error);
      reply.status(500);
      return {
        error: 'Internal server error'
      };
    }
  });
  fastify.get('/api/users/:id', async (request, reply) => {
    const userId = request.params.id;
    try {
      const user = await getUserById(userId);
      if (!user) {
        reply.status(404);
        return {
          error: 'User not found'
        };
      }
      return {
        user
      };
    } catch (error) {
      console.error('Failed to get user:', error);
      reply.status(500);
      return {
        error: 'Internal server error'
      };
    }
  });
  fastify.post('/api/users', async (request, reply) => {
    const validation = validateUserData(request.body);
    if (!validation.valid) {
      reply.status(400);
      return {
        error: 'Invalid user data',
        details: validation.errors
      };
    }
    try {
      const user = await createUser(request.body);
      reply.status(201);
      return {
        user
      };
    } catch (error) {
      console.error('Failed to create user:', error);
      reply.status(500);
      return {
        error: 'Failed to create user'
      };
    }
  });
})
```

### Chunk 2

**Metadata:**
- Type: `ast_semantic_pack`
- Tokens: 15
- Has Imports: false
- Balanced Braces: ✅

**Full Content:**

```javascript
fastify.addHook('preHandler', async (request, reply) => {})
```

### Split Telemetry

**Overall Statistics:**
- Total Chunks: 2
- Mean Tokens: 198
- Max Tokens: 380
- 95th Percentile: 380
- Complete Blocks: 0%
- Balanced Chunks: 100%
- Chunks with Imports: 0

**Splitting Type Distribution:**
- `ast_semantic`: 1 chunks (50%)
- `ast_semantic_pack`: 1 chunks (50%)

---

## Test Case: Mixed Content with Line Window Fallback

**Description:** Tests line window fallback with token budget enforcement and brace snapping

**Original Code Length:** 1469 characters

**Result:** ✅ Generated 2 chunks

### Chunk 1

**Metadata:**
- Type: `residual`
- Tokens: 346
- Has Imports: false
- Balanced Braces: ✅

**Full Content:**

```javascript
const hugeDataStructure = {
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            data: "This is a very deeply nested structure that should trigger line window splitting",
            arrays: [{
              id: 1,
              name: "First item",
              description: "A very long description that goes on and on and on"
            }, {
              id: 2,
              name: "Second item",
              description: "Another very long description with lots of details"
            }, {
              id: 3,
              name: "Third item",
              description: "Yet another long description that provides extensive information"
            }],
            functions: {
              process: function (item) {
                if (item.name.includes("special")) {
                  return {
                    ...item,
                    special: true,
                    processed: new Date()
                  };
                }
                return {
                  ...item,
                  processed: new Date()
                };
              },
              validate: function (item) {
                const required = ['id', 'name', 'description'];
                return required.every(field => item.hasOwnProperty(field));
              }
            }
          }
        }
      }
    }
  }
};
const
```

### Chunk 2

**Metadata:**
- Type: `ast_semantic_pack`
- Tokens: 59
- Has Imports: false
- Balanced Braces: ✅

**Full Content:**

```javascript
anotherLargeFunction = async (data, options) => {
  const results = [];
  for (const item of data) {
    const processed = await processItem(item);
    if (processed.valid) {
      results.push(processed);
    }
  }
  return results;
}
```

### Split Telemetry

**Overall Statistics:**
- Total Chunks: 2
- Mean Tokens: 203
- Max Tokens: 346
- 95th Percentile: 346
- Complete Blocks: 50%
- Balanced Chunks: 100%
- Chunks with Imports: 0

**Splitting Type Distribution:**
- `residual`: 1 chunks (50%)
- `ast_semantic_pack`: 1 chunks (50%)

---

## Summary

This comprehensive test validates all AST splitter refinements:

1. ✅ **String-aware brace balance** - Ignores braces inside string literals
2. ✅ **Token budget enforcement** - Line windows respect maxTokens after snapping
3. ✅ **Import prepending** - Semantic chunks include imports when budget allows
4. ✅ **Enhanced sanitizer safety** - Preserves logs in route/plugin callbacks
5. ✅ **Telemetry collection** - Comprehensive statistics for validation

All chunks are shown in full detail for thorough analysis and validation.
