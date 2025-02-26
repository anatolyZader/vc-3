'use strict';

module.exports = {
  $id: 'schema:target-code:get',
  type: 'object',
  properties: {
    params: {
      type: 'object',
      properties: {
        moduleId: { type: 'string', minLength: 1 }
      },
      required: ['moduleId']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string', minLength: 1 }
        },
        required: ['id']
      }
    }
  }
};
