'use strict';

module.exports = {
  $id: 'schema:ai-assist:start-conversation',
  body: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        format: 'uuid',
        description: 'Unique identifier of the user starting the AI conversation.',
      }
    },
    additionalProperties: false
  }
};
