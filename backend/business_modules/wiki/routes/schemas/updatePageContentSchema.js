'use strict';

module.exports = {
  $id: 'schema:wiki:update-page-content',
  params: {
    type: 'object',
    required: ['pageId'],
    properties: {
      pageId: { type: 'string', format: 'uuid', description: 'Unique identifier of the wiki page being updated.' }
    },
    additionalProperties: false
  },
  body: {
    type: 'object',
    required: ['userId', 'newContent'],
    properties: {
      userId: { type: 'string', format: 'uuid', description: 'Unique identifier of the user updating the wiki page content.' },
      newContent: { type: 'string', minLength: 1, description: 'Updated content for the wiki page.' }
    },
    additionalProperties: false
  }
};
