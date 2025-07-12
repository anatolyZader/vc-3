'use strict';

const fetchHttpApiSchema = {
  $id: 'schema:api:http-api',
  type: 'object',
  querystring: {
    type: 'object',
    properties: {
      repoId: { type: 'string', description: 'Repository ID' },
    },
    required: ['repoId']
  },
  response: {
    200: {
      type: 'object',
      description: 'API specification',
      additionalProperties: true,
    },
    401: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer' },
        error: { type: 'string' },
        message: { type: 'string' }
      },
      required: ['statusCode', 'error', 'message']
    }
  }
};

module.exports = fetchHttpApiSchema;