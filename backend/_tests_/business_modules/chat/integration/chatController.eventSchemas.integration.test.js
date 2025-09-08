"use strict";

const path = require("path");
const Fastify = require("fastify");
const ChatService = require("../../../../business_modules/chat/application/services/chatService");

describe("Chat Controller -> event payload schemas", () => {
  const controllerPath = path.resolve(
    __dirname,
    "../../../../business_modules/chat/application/chatController.js"
  );
  const routerPath = path.resolve(
    __dirname,
    "../../../../business_modules/chat/input/chatRouter.js"
  );

  function buildWithRealService({ capture }) {
    const app = Fastify({ logger: false });

    // auth stub
    app.decorate("verifyToken", async (request) => {
      request.user = { id: "u-1" };
    });

    // minimal httpErrors
    app.decorate("httpErrors", {
      internalServerError: (msg, { cause } = {}) => Object.assign(new Error(msg), { statusCode: 500, cause }),
      badRequest: (msg) => Object.assign(new Error(msg), { statusCode: 400 }),
    });

    // mock adapters
    const published = [];
    const chatMessagingAdapter = {
      publishEvent: jest.fn(async (eventName, payload) => {
        published.push({ event: eventName, payload });
        if (capture) capture({ event: eventName, payload });
      }),
      // fallbacks not used here
      addQuestion: jest.fn(),
      addAnswer: jest.fn(),
    };

    const chatPersistAdapter = {
      addQuestion: jest.fn(async () => "q-ctrl-1"),
      addAnswer: jest.fn(async () => "a-ctrl-1"),
      fetchConversation: jest.fn(async () => ({ messages: [] })),
      startConversation: jest.fn(),
      renameConversation: jest.fn(),
      deleteConversation: jest.fn(),
    };

    const chatService = new ChatService({ chatPersistAdapter, chatMessagingAdapter });

    // DI scope per request
    app.decorateRequest("diScope", null);
    app.addHook("onRequest", async (req) => {
      req.diScope = { resolve: (name) => (name === "chatService" ? chatService : null) };
    });

    app.register(require(controllerPath));
    app.register(require(routerPath), { prefix: "/api/chat" });

    return { app, published };
  }

  test("POST /:conversationId/question publishes questionAdded matching schema", async () => {
    const events = [];
    const { app, published } = buildWithRealService({ capture: (e) => events.push(e) });
    await app.ready();

    const res = await app.inject({ method: "POST", url: "/c-qa/question", payload: { prompt: "Why?" } });
    expect(res.statusCode).toBe(200);

    // Validate event
    expect(published.length).toBe(1);
    const evt = published[0];
    expect(evt.event).toBe("questionAdded");

    const { getChatEventValidators } = require("../../../helpers/eventSchemas");
    const { validateQuestionAdded } = getChatEventValidators();
    expect(validateQuestionAdded({ event: evt.event, payload: evt.payload })).toBe(true);

    await app.close();
  });

  test("POST /:conversationId/answer publishes answerAdded matching schema", async () => {
    const { app, published } = buildWithRealService({});
    await app.ready();

    const res = await app.inject({ method: "POST", url: "/c-an/answer", payload: { aiResponse: "OK" } });
    expect(res.statusCode).toBe(200);

    expect(published.length).toBe(1);
    const evt = published[0];
    expect(evt.event).toBe("answerAdded");

    const { getChatEventValidators } = require("../../../helpers/eventSchemas");
    const { validateAnswerAdded } = getChatEventValidators();
    expect(validateAnswerAdded({ event: evt.event, payload: evt.payload })).toBe(true);

    await app.close();
  });
});
