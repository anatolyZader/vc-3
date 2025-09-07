"use strict";

const Ajv = require("ajv");

const ajv = new Ajv({ allErrors: true, strict: false });

// API module event schemas
const httpApiSchemas = {
  fetchHttpApiRequest: {
    type: "object",
    additionalProperties: false,
    required: ["event", "payload"],
    properties: {
      event: { const: "fetchHttpApiRequest" },
      payload: {
        type: "object",
        additionalProperties: true,
        required: ["userId", "repoId"],
        properties: {
          userId: { type: "string", minLength: 1 },
          repoId: { type: "string", minLength: 1 },
          correlationId: { type: "string", minLength: 1 },
        },
      },
    },
  },
  httpApiFetched: {
    type: "object",
    additionalProperties: false,
    required: ["event", "payload"],
    properties: {
      event: { const: "httpApiFetched" },
      payload: {
        type: "object",
        additionalProperties: true,
        required: ["correlationId"],
        properties: {
          correlationId: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

function getApiEventValidators() {
  return {
    validateFetchHttpApiRequest: ajv.compile(httpApiSchemas.fetchHttpApiRequest),
    validateHttpApiFetched: ajv.compile(httpApiSchemas.httpApiFetched),
  };
}

module.exports = { getApiEventValidators };

// Chat module event schemas and validators
const chatSchemas = {
  conversationStarted: {
    type: "object",
    additionalProperties: false,
    required: ["event", "payload"],
    properties: {
      event: { const: "conversationStarted" },
      payload: {
        type: "object",
        additionalProperties: true,
        required: ["userId", "conversationId"],
        properties: {
          userId: { type: "string", minLength: 1 },
          conversationId: { type: "string", minLength: 1 },
          title: { type: "string" },
        },
      },
    },
  },
  questionAdded: {
    type: "object",
    additionalProperties: false,
    required: ["event", "payload"],
    properties: {
      event: { const: "questionAdded" },
      payload: {
        type: "object",
        additionalProperties: true,
        required: ["userId", "conversationId", "prompt"],
        properties: {
          userId: { type: "string", minLength: 1 },
          conversationId: { type: "string", minLength: 1 },
          prompt: { type: "string", minLength: 1 },
        },
      },
    },
  },
  answerAdded: {
    type: "object",
    additionalProperties: false,
    required: ["event", "payload"],
    properties: {
      event: { const: "answerAdded" },
      payload: {
        type: "object",
        additionalProperties: true,
        required: ["userId", "conversationId", "answer"],
        properties: {
          userId: { type: "string", minLength: 1 },
          conversationId: { type: "string", minLength: 1 },
          answer: { type: "string", minLength: 1 },
        },
      },
    },
  },
  conversationRenamed: {
    type: "object",
    additionalProperties: false,
    required: ["event", "payload"],
    properties: {
      event: { const: "conversationRenamed" },
      payload: {
        type: "object",
        additionalProperties: true,
        required: ["userId", "conversationId", "newTitle"],
        properties: {
          userId: { type: "string", minLength: 1 },
          conversationId: { type: "string", minLength: 1 },
          newTitle: { type: "string", minLength: 1 },
        },
      },
    },
  },
  conversationDeleted: {
    type: "object",
    additionalProperties: false,
    required: ["event", "payload"],
    properties: {
      event: { const: "conversationDeleted" },
      payload: {
        type: "object",
        additionalProperties: true,
        required: ["userId", "conversationId"],
        properties: {
          userId: { type: "string", minLength: 1 },
          conversationId: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

function getChatEventValidators() {
  return {
    validateConversationStarted: ajv.compile(chatSchemas.conversationStarted),
    validateQuestionAdded: ajv.compile(chatSchemas.questionAdded),
    validateAnswerAdded: ajv.compile(chatSchemas.answerAdded),
    validateConversationRenamed: ajv.compile(chatSchemas.conversationRenamed),
    validateConversationDeleted: ajv.compile(chatSchemas.conversationDeleted),
  };
}

module.exports.getChatEventValidators = getChatEventValidators;
