'use strict';

const httpApiSchema = {
  $id: 'schema:api:http-api',
  querystring: {
    type: 'object',
    required: ['userId', 'repoId'],
    properties: {
      userId: { type: 'string', description: 'User ID' },
      repoId: { type: 'string', description: 'Repository ID' },
    },
  },
  response: {
    200: {
      type: 'object',
      description: 'API specification',
      additionalProperties: true, // OpenAPI spec is a large object, so be permissive
    },
    401: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', const: 401 },
        error: { type: 'string', const: 'Unauthorized' },
        message: { type: 'string' }
      },
      required: ['statusCode', 'error', 'message']
    }
  }
};

module.exports = httpApiSchema;