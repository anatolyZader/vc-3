// aiRouter.js
'use strict';
const fp = require('fastify-plugin');

module.exports = fp(async function aiRouter(fastify, opts) {
  console.log('aiRouter is loaded!');

  fastify.route({
    method: 'POST',
    url: '/respond',
    preValidation: [fastify.verifyToken],
    handler: fastify.respondToPrompt,
    schema: {
      tags: ['ai'],
      body: {
        type: 'object',
        required: ['conversationId', 'prompt'],
        properties: {
          conversationId: { type: 'string', minLength: 1 },
          prompt: { type: 'string', minLength: 1 }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            response: { type: 'string' }, // or object/array depending on actual response shape!
            status: { type: 'string', enum: ['success', 'failure'] },
            timestamp: { type: 'string', format: 'date-time' }
          },
          required: ['response', 'status', 'timestamp'],
          additionalProperties: false
        }
      }
    }
  });
  
  fastify.route({
    method: 'POST',
    url: '/process-pushed-repo',
    preValidation: [fastify.verifyToken],
    handler: fastify.processPushedRepo,
    schema: {
      tags: ['ai'],
      body: {
        type: 'object',
        required: ['repoId', 'repoData'],
        properties: {
          repoId: { type: 'string', minLength: 1 },
          repoData: { type: 'object' } // If you can specify the shape, do so!
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object', // Adjust shape to match what you actually return!
          properties: {
            result: { type: 'string' }, // or whatever your response shape is
            details: { type: 'object' }
          },
          additionalProperties: true // or false if you want strict checking
        }
      }
    }
  });

  fastify.route({
    method: 'POST',
    url: '/manual-process-repo-direct',
    preValidation: [fastify.verifyToken],
    handler: fastify.manualProcessRepoDirect,
    schema: {
      tags: ['ai'],
      summary: 'Manually process a repository directly for RAG indexing',
      description: 'Directly trigger repository processing for vector embedding storage without external GitHub API calls',
      body: {
        type: 'object',
        required: ['repoId'],
        properties: {
          repoId: { 
            type: 'string', 
            minLength: 1,
            description: 'Repository identifier (e.g., "owner/repo-name")'
          },
          githubOwner: { 
            type: 'string',
            description: 'GitHub repository owner/organization name (optional, will be extracted from repoId if not provided)'
          },
          repoName: { 
            type: 'string',
            description: 'GitHub repository name (optional, will be extracted from repoId if not provided)'
          },
          branch: { 
            type: 'string', 
            default: 'main',
            description: 'Repository branch to process (defaults to "main")'
          },
          repoUrl: { 
            type: 'string',
            description: 'Full repository URL (optional, will be constructed if not provided)'
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            repoId: { type: 'string' },
            repoData: {
              type: 'object',
              properties: {
                githubOwner: { type: 'string' },
                repoName: { type: 'string' },
                repoUrl: { type: 'string' },
                branch: { type: 'string' },
                description: { type: 'string' },
                timestamp: { type: 'string' }
              },
              additionalProperties: false
            },
            data: { 
              type: 'object',
              additionalProperties: true
            }
          },
          additionalProperties: false
        }
      }
    }
  });

  // CI/CD RAG indexing endpoint - for GitHub Actions workflows
  fastify.route({
    method: 'POST',
    url: '/ci/trigger-indexing',
    preValidation: async (request, reply) => {
      // Check for GITHUB_TOKEN in Authorization header (GitHub Actions provides this)
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        throw fastify.httpErrors.unauthorized('Missing authorization header');
      }
      
      // For CI environment, we accept the GitHub token or a simple bearer token
      // In production with GCP, this endpoint should be disabled or more strictly controlled
      const token = authHeader.replace('Bearer ', '');
      if (!token || token.length < 10) {
        throw fastify.httpErrors.unauthorized('Invalid token');
      }
      
      // Set a mock user for CI operations
      request.user = { 
        id: 'github-actions-ci', 
        username: 'github-actions' 
      };
    },
    handler: async (request, reply) => {
      try {
        const { repoId, repoData } = request.body;
        
        if (!repoId) {
          throw fastify.httpErrors.badRequest('repoId is required');
        }
        
        fastify.log.info(`[CI] Triggering RAG indexing for repo: ${repoId}`);
        
        // Create DI scope
        const diScope = fastify.diContainer.createScope();
        const aiService = await diScope.resolve('aiService');
        
        if (!aiService) {
          throw new Error('AI service not found in DI container');
        }
        
        // Process the repo (this triggers the RAG pipeline)
        const result = await aiService.processPushedRepo(
          request.user.id,
          repoId,
          repoData || {
            url: `https://github.com/${repoId}`,
            branch: 'dev',
            timestamp: new Date().toISOString(),
            source: 'github-actions-ci'
          }
        );
        
        fastify.log.info(`[CI] RAG indexing triggered successfully for ${repoId}`);
        
        return {
          success: true,
          message: 'RAG indexing triggered successfully',
          repoId,
          result
        };
      } catch (error) {
        fastify.log.error('[CI] Error triggering RAG indexing:', error);
        throw fastify.httpErrors.internalServerError('Failed to trigger RAG indexing', { cause: error });
      }
    },
    schema: {
      tags: ['ai', 'ci'],
      summary: 'Trigger RAG indexing from CI/CD pipeline',
      description: 'CI/CD endpoint for triggering repository indexing from GitHub Actions',
      body: {
        type: 'object',
        required: ['repoId'],
        properties: {
          repoId: { 
            type: 'string', 
            minLength: 1,
            description: 'Repository identifier (e.g., "owner/repo-name")'
          },
          repoData: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              branch: { type: 'string' },
              commitHash: { type: 'string' },
              githubOwner: { type: 'string' },
              repoName: { type: 'string' },
              description: { type: 'string' },
              timestamp: { type: 'string' },
              source: { type: 'string' }
            },
            additionalProperties: true
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            repoId: { type: 'string' },
            result: { 
              type: 'object',
              additionalProperties: true
            }
          },
          additionalProperties: false
        }
      }
    }
  });

  // Text search endpoint
  fastify.route({
    method: 'GET',
    url: '/search/text',
    preValidation: [fastify.verifyToken],
    handler: fastify.searchText,
    schema: {
      tags: ['ai', 'search'],
      summary: 'Search documents using PostgreSQL text search',
      description: 'Perform text-based search across stored documents using PostgreSQL full-text search capabilities',
      querystring: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { 
            type: 'string', 
            minLength: 1,
            description: 'Search query text'
          },
          repoId: { 
            type: 'string',
            description: 'Filter by repository ID (optional)'
          },
          limit: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 50, 
            default: 10,
            description: 'Maximum number of results to return'
          },
          offset: { 
            type: 'integer', 
            minimum: 0, 
            default: 0,
            description: 'Offset for pagination'
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  repoId: { type: 'string' },
                  content: { type: 'string' },
                  rank: { type: 'number' },
                  snippet: { type: 'string' },
                  searchType: { type: 'string' },
                  source: { type: 'string' }
                },
                required: ['id', 'content', 'rank', 'searchType', 'source'],
                additionalProperties: false
              }
            },
            query: { type: 'string' },
            totalResults: { type: 'integer' },
            searchType: { type: 'string', enum: ['text'] }
          },
          required: ['results', 'query', 'totalResults', 'searchType'],
          additionalProperties: false
        }
      }
    }
  });

  // Hybrid search endpoint
  fastify.route({
    method: 'GET',
    url: '/search/hybrid',
    preValidation: [fastify.verifyToken],
    handler: fastify.searchHybrid,
    schema: {
      tags: ['ai', 'search'],
      summary: 'Search documents using both vector and text search',
      description: 'Perform hybrid search combining Pinecone vector search and PostgreSQL text search for comprehensive results',
      querystring: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { 
            type: 'string', 
            minLength: 1,
            description: 'Search query text'
          },
          repoId: { 
            type: 'string',
            description: 'Filter by repository ID (optional)'
          },
          limit: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 50, 
            default: 10,
            description: 'Maximum number of results to return'
          },
          includeVector: { 
            type: 'boolean', 
            default: true,
            description: 'Include vector search results'
          },
          includeText: { 
            type: 'boolean', 
            default: true,
            description: 'Include text search results'
          },
          strategy: { 
            type: 'string', 
            enum: ['interleave', 'vector_first', 'text_first'], 
            default: 'interleave',
            description: 'Strategy for merging results from different search types'
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  content: { type: 'string' },
                  rank: { type: 'number' },
                  snippet: { type: 'string' },
                  searchType: { type: 'string', enum: ['vector', 'text', 'simple_text'] },
                  source: { type: 'string', enum: ['pinecone', 'postgres'] },
                  metadata: { type: 'object' }
                },
                required: ['id', 'content', 'rank', 'searchType', 'source'],
                additionalProperties: true
              }
            },
            query: { type: 'string' },
            totalResults: { type: 'integer' },
            searchType: { type: 'string', enum: ['hybrid'] },
            searchStats: {
              type: 'object',
              properties: {
                vectorResults: { type: 'integer' },
                textResults: { type: 'integer' }
              }
            }
          },
          required: ['results', 'query', 'totalResults', 'searchType'],
          additionalProperties: false
        }
      }
    }
  });

  // Search capabilities endpoint
  fastify.route({
    method: 'GET',
    url: '/search/capabilities',
    preValidation: [fastify.verifyToken],
    handler: fastify.getSearchCapabilities,
    schema: {
      tags: ['ai', 'search'],
      summary: 'Get information about available search capabilities',
      description: 'Returns information about which search systems are available and their status',
      response: {
        200: {
          type: 'object',
          properties: {
            vectorSearch: {
              type: 'object',
              properties: {
                available: { type: 'boolean' },
                connected: { type: 'boolean' }
              },
              required: ['available', 'connected']
            },
            textSearch: {
              type: 'object',
              properties: {
                available: { type: 'boolean' },
                connected: { type: 'boolean' }
              },
              required: ['available', 'connected']
            },
            hybridSearch: {
              type: 'object',
              properties: {
                available: { type: 'boolean' }
              },
              required: ['available']
            },
            detailed: { type: 'object' }
          },
          required: ['vectorSearch', 'textSearch', 'hybridSearch'],
          additionalProperties: true
        }
      }
    }
  });

  // Test search systems endpoint
  fastify.route({
    method: 'POST',
    url: '/search/test',
    preValidation: [fastify.verifyToken],
    handler: fastify.testSearchSystems,
    schema: {
      tags: ['ai', 'search'],
      summary: 'Test all search systems with a sample query',
      description: 'Runs a test query against all available search systems to verify they are working correctly',
      body: {
        type: 'object',
        properties: {
          testQuery: { 
            type: 'string', 
            default: 'function',
            description: 'Query to test with (defaults to "function")'
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            vectorSearch: {
              type: 'object',
              properties: {
                available: { type: 'boolean' },
                success: { type: 'boolean' },
                results: { type: 'array' },
                error: { type: 'string' }
              },
              required: ['available', 'success', 'results']
            },
            textSearch: {
              type: 'object',
              properties: {
                available: { type: 'boolean' },
                success: { type: 'boolean' },
                results: { type: 'array' },
                error: { type: 'string' }
              },
              required: ['available', 'success', 'results']
            },
            hybridSearch: {
              type: 'object',
              properties: {
                available: { type: 'boolean' },
                success: { type: 'boolean' },
                results: { type: 'object' },
                error: { type: 'string' }
              },
              required: ['available', 'success', 'results']
            }
          },
          required: ['vectorSearch', 'textSearch', 'hybridSearch'],
          additionalProperties: false
        }
      }
    }
  });

});