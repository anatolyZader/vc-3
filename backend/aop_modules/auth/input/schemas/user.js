'use strict';

const userSchema = {
  $id: 'schema:auth:user',
  type: 'object',
  description: 'User schema representing a user entity',
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: {
        type: 'string',
        format: 'uuid'
      },
      username: {
        type: 'string'
      }
    },
    required: ['id', 'username']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uuid'
        },
        username: {
          type: 'string'
        }
      },
      required: ['id', 'username']
    }
  }
};

module.exports = userSchema;