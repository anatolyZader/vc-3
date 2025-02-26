'use strict';

module.exports = {
  $id: 'schema:ai-assist:respond-to-prompt',
  body: {
    type: 'object',
    required: ['userId', 'prompt'],
    properties: {
      userId: {
        type: 'string',
        format: 'uuid',
        description: 'Unique identifier of the user making the AI request.',
      },
      prompt: {
        type: 'string',
        minLength: 1,
        description: 'The input prompt for AI response generation.',
      }
    },
    additionalProperties: false
  }
};
