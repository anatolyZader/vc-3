'use strict';
// fetchRepoSchema.js

module.exports = {
  $id: 'schema:git:fetch-repository',
  type: 'object',

  // OpenAPI-specific properties (for Swagger UI)
  tags: ['git'],
  summary: 'Fetch repository information',
  description: 'Retrieve detailed information about a GitHub repository and its default branch',

  // Request parameters
  params: {
    type: 'object',
    required: ['owner', 'repo'],
    properties: {
      owner: { 
        type: 'string', 
        description: 'Repository owner (username or organization)'
      },
      repo: { 
        type: 'string', 
        description: 'Repository name'
      }
    }
  },

  // Response schema
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Repository ID' },
        name: { type: 'string', description: 'Repository name' },
        fullName: { type: 'string', description: 'Full repository name with owner' },
        owner: {
          type: 'object',
          properties: {
            login: { type: 'string' },
            id: { type: 'string' },
            avatarUrl: { type: 'string', format: 'uri' }
          }
        },
        description: { type: 'string', nullable: true },
        private: { type: 'boolean' },
        htmlUrl: { type: 'string', format: 'uri' },
        apiUrl: { type: 'string', format: 'uri' },
        defaultBranch: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        hasWiki: { type: 'boolean' },
        license: {
          type: 'object',
          nullable: true,
          properties: {
            key: { type: 'string' },
            name: { type: 'string' },
            spdxId: { type: 'string', nullable: true }
          }
        },
        topics: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    404: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', enum: [404] },
        error: { type: 'string', example: 'Not Found' },
        message: { type: 'string', example: 'Repository not found' }
      }
    },
    401: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', enum: [401] },
        error: { type: 'string', example: 'Unauthorized' },
        message: { type: 'string', example: 'Authentication required' }
      }
    },
    500: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', enum: [500] },
        error: { type: 'string', example: 'Internal Server Error' },
        message: { type: 'string', example: 'Failed to fetch repository' }
      }
    }
  }
};