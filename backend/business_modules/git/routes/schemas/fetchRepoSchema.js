'use strict';
// fetchRepoSchema.js

module.exports = {
  $id: 'schema:git:fetch-repo',

  // OpenAPI-specific properties (for Swagger UI)
  tags: ['git'],
  summary: 'Fetch repository information',
  description: 'Retrieve detailed information about a GitHub repository and its default branch',

  // Security requirements
  security: [
    { bearerAuth: [] },
    { cookieAuth: [] }
  ],

  // Path parameters: owner  and repo name
  params: {
    type: 'object',
    required: ['owner', 'repo'],
    properties: {
      owner: {
        type: 'string',
        description: 'GitHub owner or organization name',
        pattern: '^[a-zA-Z0-9._-]+$'
      },
      repo: {
        type: 'string',
        description: 'Repository name',
        pattern: '^[a-zA-Z0-9._-]+$'
      }
    },
    additionalProperties: false
  },

  // Response schemas
  response: {
    // 200 OK
    200: {
      type: 'object',
      description: 'Repository information retrieved successfully',
      properties: {
        repository: {
          type: 'object',
          description: 'GitHub repository information',
          properties: {
            id:              { type: 'integer', description: 'GitHub repository ID' },
            name:            { type: 'string',  description: 'Repository name' },
            full_name:       { type: 'string',  description: 'Full repository name including owner' },
            description:     { type: ['string','null'], description: 'Repository description' },
            html_url:        { type: 'string', format: 'uri', description: 'Repository URL' },
            stargazers_count:{ type: 'integer', description: 'Number of stars' },
            forks_count:     { type: 'integer', description: 'Number of forks' },
            language:        { type: ['string','null'], description: 'Primary programming language' },
            created_at:      { type: 'string', format: 'date-time', description: 'Repository creation date' },
            updated_at:      { type: 'string', format: 'date-time', description: 'Repository last update date' },
            default_branch:  { type: 'string', description: 'Default branch name' }
          },
          required: ['id','name','full_name','html_url','stargazers_count','forks_count','created_at','updated_at','default_branch'],
          additionalProperties: true
        },
        branch: {
          type: 'object',
          description: 'Default branch information',
          properties: {
            name: { type: 'string', description: 'Branch name' },
            commit: {
              type: 'object',
              description: 'Latest commit information',
              properties: {
                sha:      { type: 'string', description: 'Commit SHA hash' },
                url:      { type: 'string', format: 'uri', description: 'Commit API URL' },
                html_url: { type: 'string', format: 'uri', description: 'Commit GitHub URL' }
              },
              required: ['sha','url','html_url'],
              additionalProperties: true
            }
          },
          required: ['name','commit'],
          additionalProperties: true
        }
      },
      required: ['repository','branch'],
      additionalProperties: false
    },

    // 400 Bad Request
    400: {
      type: 'object',
      description: 'Bad Request - Invalid owner or repo name',
      properties: {
        statusCode: { type: 'integer' },
        error:      { type: 'string' },
        message:    { type: 'string' }
      },
      required: ['statusCode','error','message'],
      additionalProperties: false
    },

    // 401 Unauthorized
    401: {
      type: 'object',
      description: 'Unauthorized - Authentication required',
      properties: {
        statusCode: { type: 'integer' },
        error:      { type: 'string' },
        message:    { type: 'string' }
      },
      required: ['statusCode','error','message'],
      additionalProperties: false
    },

    // 404 Not Found
    404: {
      type: 'object',
      description: 'Not Found - Repository does not exist',
      properties: {
        statusCode: { type: 'integer' },
        error:      { type: 'string' },
        message:    { type: 'string' }
      },
      required: ['statusCode','error','message'],
      additionalProperties: false
    },

    // 500 Internal Server Error
    500: {
      type: 'object',
      description: 'Internal Server Error',
      properties: {
        statusCode: { type: 'integer' },
        error:      { type: 'string' },
        message:    { type: 'string' }
      },
      required: ['statusCode','error','message'],
      additionalProperties: false
    }
  }
};
