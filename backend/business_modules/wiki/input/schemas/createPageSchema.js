'use strict';

module.exports = {
  $id: 'schema:wiki:create-page',
  body: {
    type: 'object',
    required: ['userId', 'title', 'content'],
    properties: {
      userId: { type: 'string', format: 'uuid', description: 'Unique identifier of the user creating the wiki page.' },
      title: { type: 'string', minLength: 1, description: 'Title of the wiki page.' },
      content: { type: 'string', minLength: 1, description: 'Content of the wiki page.' }
    },
    additionalProperties: false
  }
};
