'use strict';

const tokenSchema = {
  $id: 'schema:auth:token',
  type: 'object',
  description: 'Authentication token schema',
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      token: {
        type: 'string'
      },
      message: {
        type: 'string'
      },
      user: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          email: {
            type: 'string',
            format: 'email'
          },
          username: {
            type: 'string'
          }
        }
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        token: {
          type: 'string'
        },
        user: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            username: {
              type: 'string'
            }
          }
        }
      }
    }
  }
};

module.exports = tokenSchema;