'use strict';

const readApiSchema = {
  $id: 'schema:api:read-api',
  response: {
    200: {
      type: 'object',
      description: 'OpenAPI specification',
      additionalProperties: true // The OpenAPI object is large and dynamic
    }
  }
};

module.exports = readApiSchema;