// chatRouter.js
'use strict';
const fp = require('fastify-plugin');

module.exports = fp(async function chatRouter(fastify, opts) {
  console.log('chatRouter is loaded!');

  // start a new conversation
  fastify.route({
    method: 'POST',
    url: '/start',
    preValidation: [fastify.verifyToken],
    handler: fastify.startConversation,
    schema: {
      tags: ['chat'],
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 }
        },
        required: ['title'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' }
          },
          required: ['conversationId'],
          additionalProperties: false
        }
      }
    }
  });

  // fetch conversations history
  fastify.route({
    method: 'GET',
    url: '/history',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchConversationsHistory,
    schema: {
      tags: ['chat'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              conversationId: { type: 'string' },
              title: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            },
            required: ['conversationId', 'title', 'createdAt', 'updatedAt'],
            additionalProperties: true
          }
        }
      }
    }
  });

  // generate a conversation title using AI based on first 3 user prompts
  fastify.route({
    method: 'POST',
    url: '/name-conversation',
    preValidation: [fastify.verifyToken],
    handler: fastify.nameConversation,
    schema: {
      tags: ['chat'],
      body: {
        type: 'object',
        properties: {
          conversationId: { type: 'string' }
        },
        required: ['conversationId'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
            title: { type: 'string' }
          },
          required: ['conversationId', 'title'],
          additionalProperties: false
        }
      }
    }
  });

  // fetch specific conversation
  fastify.route({
    method: 'GET',
    url: '/:conversationId',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchConversation,
    schema: {
      tags: ['chat'],
      params: {
        type: 'object',
        properties: {
          conversationId: { type: 'string' }
        },
        required: ['conversationId'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
            title: { type: 'string' },
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'ai'] },
                  text: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' }
                },
                required: ['role', 'text', 'timestamp'],
                additionalProperties: false
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['conversationId', 'title', 'messages', 'createdAt', 'updatedAt'],
          additionalProperties: true
        }
      }
    }
  });

  // add a question
  fastify.route({
    method: 'POST',
    url: '/:conversationId/question',
    preValidation: [fastify.verifyToken],
    handler: fastify.addQuestion,
    schema: {
      tags: ['chat'],
      params: {
        type: 'object',
        properties: {
          conversationId: { type: 'string' }
        },
        required: ['conversationId'],
        additionalProperties: false
      },
      body: {
        type: 'object',
        properties: {
          prompt: { type: 'string', minLength: 1 }
        },
        required: ['prompt'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            questionId: { type: 'string' },
            status: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          },
          required: ['questionId', 'status', 'message', 'timestamp'],
          additionalProperties: false
        }
      }
    }
  });

  // add a voice question (speech-to-text + question)
  fastify.route({
    method: 'POST',
    url: '/:conversationId/voice',
    preValidation: [fastify.verifyToken],
    handler: fastify.addVoiceQuestion,
    schema: {
      tags: ['chat'],
      params: {
        type: 'object',
        properties: {
          conversationId: { type: 'string' }
        },
        required: ['conversationId'],
        additionalProperties: false
      },
      consumes: ['multipart/form-data'],
      // Note: No body schema for multipart - handled by @fastify/multipart plugin
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transcript: { type: 'string' },
            confidence: { type: 'number' },
            questionId: { type: 'string' },
            status: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          },
          required: ['success', 'transcript', 'questionId', 'status', 'message', 'timestamp'],
          additionalProperties: false
        }
      }
    }
  });


  // send an answer
  fastify.route({
    method: 'POST',
    url: '/:conversationId/answer',
    preValidation: [fastify.verifyToken],
    handler: fastify.addAnswer,
    schema: {
      tags: ['chat'],
      params: {
        type: 'object',
        properties: {
          conversationId: { type: 'string' }
        },
        required: ['conversationId'],
        additionalProperties: false
      },
      body: {
        type: 'object',
        properties: {
          aiResponse: { type: 'string', minLength: 1 }
        },
        required: ['aiResponse'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            answerId: { type: 'string' },
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          },
          required: ['answerId', 'status', 'timestamp'],
          additionalProperties: false
        }
      }
    }
  });

  // rename a conversation
  fastify.route({
    method: 'PATCH',
    url: '/:conversationId/rename',
    preValidation: [fastify.verifyToken],
    handler: fastify.renameConversation,
    schema: {
      tags: ['chat'],
      params: {
        type: 'object',
        properties: {
          conversationId: { type: 'string' }
        },
        required: ['conversationId'],
        additionalProperties: false
      },
      body: {
        type: 'object',
        properties: {
          newTitle: { type: 'string', minLength: 1 }
        },
        required: ['newTitle'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message'],
          additionalProperties: false
        }
      }
    }
  });

  // delete a conversation
  fastify.route({
    method: 'DELETE',
    url: '/:conversationId/delete',
    preValidation: [fastify.verifyToken],
    handler: fastify.deleteConversation,
    schema: {
      tags: ['chat'],
      params: {
        type: 'object',
        properties: {
          conversationId: { type: 'string' }
        },
        required: ['conversationId'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message'],
          additionalProperties: false
        }
      }
    }
  });
});