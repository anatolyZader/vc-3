'use strict';

const tokenHeaderSchema = {
  $id: 'schema:auth:token-header',
  type: 'object',
  properties: {
    authorization: {
      type: 'string',
      pattern: '^Bearer [a-zA-Z0-9-._~+/]+=*$'
    }
  },
  additionalProperties: true
};

module.exports = tokenHeaderSchema;

