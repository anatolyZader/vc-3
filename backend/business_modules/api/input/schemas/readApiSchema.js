'use strict';

const readApiSchema = {
  $id: 'schema:api:read-api',
  type: 'object',
  response: {
    200: {
      type: 'object',
      description: 'OpenAPI specification',
      additionalProperties: true
    }
  }
};

module.exports = readApiSchema;