"use strict";

const path = require("path");
const Fastify = require("fastify");
const ChatService = require("../../../../business_modules/chat/application/services/chatService");

describe("Chat Controller -> conversationStarted schema", () => {
  const controllerPath = path.resolve(
    __dirname,
    "../../../../business_modules/chat/application/chatController.js"
  );
  const routerPath = path.resolve(
    __dirname,
    "../../../../business_modules/chat/input/chatRouter.js"
  );

  function build() {
    const app = Fastify({ logger: false });

    app.decorate("verifyToken", async (request) => {
      request.user = { id: "u-1" };
    });

    app.decorate("httpErrors", {
      internalServerError: (msg, { cause } = {}) => Object.assign(new Error(msg), { statusCode: 500, cause }),
      badRequest: (msg) => Object.assign(new Error(msg), { statusCode: 400 }),
    });

    const published = [];
    const chatMessagingAdapter = {
      publishEvent: jest.fn(async (eventName, payload) => published.push({ event: eventName, payload })),
      startConversation: jest.fn(async (payload) => published.push({ event: "conversationStarted", payload })),
    };
    const chatPersistAdapter = { startConversation: jest.fn(async () => {}), fetchConversation: jest.fn(async () => ({ messages: [] })) };
    const chatService = new ChatService({ chatPersistAdapter, chatMessagingAdapter });

    app.decorateRequest("diScope", null);
    app.addHook("onRequest", async (req) => {
      req.diScope = { resolve: (name) => (name === "chatService" ? chatService : null) };
    });

    app.register(require(controllerPath));
    app.register(require(routerPath), { prefix: "/api/chat" });

    return { app, published };
  }

  test("POST /start publishes conversationStarted matching schema", async () => {
    const { app, published } = build();
    await app.ready();

    const res = await app.inject({ method: "POST", url: "/start", payload: { title: "My Chat" } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toEqual({ conversationId: expect.any(String) });

    // One event expected
    expect(published.length).toBe(1);
    const evt = published[0];
    expect(evt.event).toBe("conversationStarted");

    const { getChatEventValidators } = require("../../../helpers/eventSchemas");
    const { validateConversationStarted } = getChatEventValidators();
    expect(validateConversationStarted({ event: evt.event, payload: evt.payload })).toBe(true);

    await app.close();
  });
});
